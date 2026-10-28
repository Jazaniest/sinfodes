// Kembaran dari apps/web/src/mocks/handlers/{impor,buku,statistik-ekspor,beranda-cari}.test.ts untuk bagian 8E3: pertanyaan yang sama
// diajukan ke server sungguhan lewat `panggilApi` dan modul `api/*` web yang sama, dan jawabannya harus sama dengan API tiruan.
// Perbedaan yang sudah diputuskan (rencana 8E3) ditandai `Perbedaan sengaja:`. Butir yang membaca "Buku hari ini" lewat beranda
// diperiksa lewat SQL karena Beranda baru ada di 8G; butir surat pada Cari global menunggu 8F.
import { describe, expect, it } from 'vitest'
import { ambilIsiBuku, daftarBuku } from '@/api/buku'
import { cari } from '@/api/cari'
import { GalatApi } from '@/api/galat'
import { konfirmasiImpor, unggahImpor } from '@/api/impor'
import { simpanWilayah } from '@/api/pengaturan'
import { ambilRingkasanPenduduk, daftarPenduduk } from '@/api/penduduk'
import { ambilStatistikPenduduk } from '@/api/statistik'
import { UKURAN_SEMUA_BARIS } from '@/domain/buku/schema'
import { AKUN_DESA_BARU_UJI, AKUN_UJI } from '@sinfodes/demo/uji-akun'
import { buatCsvUji } from '../helpers/berkas-uji'
import { masukSebagai, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const BERMASALAH = [5, 8, 12, 13, 17]
const sql = () => api.uji.sqlMigrasi

describe('POST /impor/penduduk (SPEC §6.8)', () => {
  it('berkas contoh: 16 kolom (2 tidak dikenali), 17 baris, NIK Siti Rahmah sudah terdaftar', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    expect(lap.namaBerkas).toBe('pendataan-rt-teluk-rengas.xlsx')
    expect(lap.kolom).toHaveLength(16)
    expect(lap.kolom.filter((k) => k.field === null).map((k) => k.judul)).toEqual(['Gol. Drh', 'Keterangan'])
    expect(lap.baris.map((b) => b.nomor)).toEqual(Array.from({ length: 17 }, (_, i) => i + 2))
    expect(lap.nikTerdaftar).toEqual(['1405095203918002'])
    expect(lap.nomorKkTerdaftar).toEqual([])
  })

  it('berkas sungguhan lewat multipart: nama berkasnya dipakai; jenis lain ditolak', async () => {
    await masukSebagai(AKUN_UJI.operator)
    // Perbedaan sengaja: tiruan tidak membaca isi berkas (selalu mengembalikan berkas contoh); server membacanya sungguhan,
    // jadi berkas uji harus berisi kepala kolom dan paling sedikit satu baris.
    const isi = new File([Buffer.from(buatCsvUji([['NIK', 'Nama'], ['1405092001900001', 'Anwar']], { pemisah: ';' }))], 'data-dusun-3.csv', { type: 'text/csv' })
    const lap = await unggahImpor(isi)
    expect(lap.namaBerkas).toBe('data-dusun-3.csv')
    expect(lap.kolom.map((k) => k.field)).toEqual(['nik', 'nama'])
    const g = await galatDari(unggahImpor(new File(['x'], 'foto.png', { type: 'image/png' })))
    expect(g).toMatchObject({ kode: 'VALIDATION', fields: { berkas: 'Berkas harus .xlsx atau .csv' } })
  })

  it('Kepala Desa → FORBIDDEN (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(unggahImpor(null))).kode).toBe('FORBIDDEN')
  })
})

describe('POST /impor/penduduk/:id/konfirmasi (fokus review 2 dan 3)', () => {
  it('baris bermasalah yang belum dilewati → VALIDATION per baris', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const g = await galatDari(konfirmasiImpor(lap.id, { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: [] }))
    expect(g.kode).toBe('VALIDATION')
    expect(Object.keys(g.fields)).toEqual(BERMASALAH.map((n) => `baris.${n}`))
  })

  it('lewati yang bermasalah → 12 penduduk dan 4 KK; dicatat; konfirmasi kedua → CONFLICT', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const masukan = { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: BERMASALAH }
    const hasil = await konfirmasiImpor(lap.id, masukan)
    expect(hasil).toMatchObject({ penduduk: 12, keluarga: 4, dilewati: 5 })
    expect(hasil.laporan.find((b) => b.nomor === 8)).toEqual({ nomor: 8, status: 'dilewati', keterangan: 'NIK sudah terdaftar di Sinfodes' })
    expect(await ambilRingkasanPenduduk()).toMatchObject({ jiwa: 2824, kk: 810 })
    // Buku hari ini dibaca beranda (8G): diperiksa lewat SQL.
    const [akt] = await sql()`select ringkasan from aktivitas where jenis = 'penduduk-impor' order by waktu desc limit 1`
    expect(akt.ringkasan).toBe('Impor penduduk · 12 penduduk, 4 KK (pendataan-rt-teluk-rengas.xlsx)')
    expect((await galatDari(konfirmasiImpor(lap.id, masukan))).kode).toBe('CONFLICT')
  })

  it('perbaikan dari pengguna dipakai; kolom yang tidak dikenali bisa dipetakan', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const pemetaan = lap.kolom.map((k) => k.field ?? (k.judul === 'Gol. Drh' ? 'golonganDarah' : null))
    const hasil = await konfirmasiImpor(lap.id, { pemetaan, perbaikan: { '13': { tanggalLahir: '28/02/2009' } }, lewati: [5, 8, 12, 17] })
    expect(hasil).toMatchObject({ penduduk: 13, keluarga: 4, dilewati: 4 })
  })

  it('pemetaan tanpa kolom wajib → VALIDATION', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const pemetaan = lap.kolom.map((k) => (k.field === 'nik' ? null : k.field))
    const g = await galatDari(konfirmasiImpor(lap.id, { pemetaan, perbaikan: {}, lewati: BERMASALAH }))
    expect(g).toMatchObject({ kode: 'VALIDATION', message: 'Pemetaan kolom belum lengkap.' })
  })
})

describe('impor desa baru (tahap 6C)', () => {
  it('desa tanpa dusun: impor ditolak dengan arahan ke Pengaturan › Wilayah', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await galatDari(unggahImpor(null))).toMatchObject({
      kode: 'VALIDATION',
      message: 'Desa belum punya dusun. Atur dusun, RW, dan RT di Pengaturan › Wilayah sebelum mengimpor penduduk.',
    })
  })

  it('desa baru dengan dusun: 12 baris contoh masuk ke wilayahnya; jiwa Sungai Sialang tetap (fokus review 1)', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    await simpanWilayah({
      istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
      dusun: [
        {
          id: 'baru-1', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani',
          rw: [{ nomor: '001', ketua: 'Rasyid', rt: [{ nomor: '001', ketua: 'Udin' }, { nomor: '002', ketua: 'Usman' }] }],
        },
      ],
    })
    const lap = await unggahImpor(null)
    await konfirmasiImpor(lap.id, { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: BERMASALAH })
    const baru = await sql()`select dusun_id, rw from penduduk where desa_id = 'desa_tanjung_lamo'`
    expect(baru).toHaveLength(12)
    expect(new Set(baru.map((p) => `${p.dusun_id} ${p.rw}`))).toEqual(new Set(['dsn_tl_1 001']))
    await masukSebagai(AKUN_UJI.operator)
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2812)
  })
})

describe('Buku Administrasi (SPEC §8)', () => {
  it('Operator melihat 24 buku; buku manual tanpa jumlah; Buku Induk berisi semua penduduk hidup', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const daftar = await daftarBuku()
    expect(daftar).toHaveLength(24)
    expect(daftar.find((b) => b.kode === 'kas-umum')).toMatchObject({ sumber: null, jumlah: null, diperbarui: null })
    expect(daftar.find((b) => b.kode === 'induk-penduduk')).toMatchObject({ sumber: 'Kependudukan', jumlah: 2812 })
    // Perbedaan sengaja: tiruan sudah mengisi 15 buku; server baru memiliki lima buku penduduk, sepuluh buku lain menunggu 8F-8G.
    expect(daftar.filter((b) => b.sumber !== null && b.jumlah !== null).map((b) => b.kode).sort()).toEqual([
      'induk-penduduk', 'ktp-kk', 'mutasi-penduduk', 'penduduk-sementara', 'rekapitulasi-penduduk',
    ])
    expect(daftar.find((b) => b.kode === 'agenda')).toMatchObject({ sumber: 'Layanan Surat (surat keluar dan masuk)', jumlah: null, diperbarui: null })
  })

  it('Kaur Keuangan hanya buku keuangan; Buku Induk yang berisi NIK ditolak; Kepala Dusun ditolak (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await daftarBuku()).map((b) => b.kode)).toEqual(['apb-desa', 'rab', 'kas-pembantu-kegiatan', 'kas-umum', 'kas-pembantu', 'bank-desa'])
    expect((await galatDari(ambilIsiBuku('induk-penduduk', { page: 1, pageSize: 25 }))).kode).toBe('FORBIDDEN')
    // Perbedaan sengaja: tiruan membuka APB Desa; di server buku ini menunggu tabel keuangan (8G).
    expect(await galatDari(ambilIsiBuku('apb-desa', { page: 1, pageSize: 25 }))).toMatchObject({ kode: 'NOT_FOUND', message: 'Sumber data buku ini belum tersedia di Sinfodes.' })
    await masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(daftarBuku())).kode).toBe('FORBIDDEN')
  })

  it.todo('Kaur Keuangan membuka Buku APB Desa (menunggu tabel keuangan, 8G)')

  it('isi per halaman; Unduh dan Cetak mengambil semua baris; buku manual dan kode tak dikenal → NOT_FOUND', async () => {
    await masukSebagai(AKUN_UJI.kades)
    const h2 = await ambilIsiBuku('induk-penduduk', { page: 2, pageSize: 25 })
    expect(h2.meta).toEqual({ page: 2, pageSize: 25, total: 2812 })
    expect(h2.baris).toHaveLength(25)
    expect(h2.baris[0][0]).toBe('26')
    const semua = await ambilIsiBuku('mutasi-penduduk', { page: 1, pageSize: UKURAN_SEMUA_BARIS })
    expect(semua.baris).toHaveLength(semua.meta.total)
    expect((await galatDari(ambilIsiBuku('kas-umum', { page: 1, pageSize: 25 }))).message).toBe('Buku ini diisi manual dan belum tersedia di Sinfodes.')
    expect((await galatDari(ambilIsiBuku('buku-hantu', { page: 1, pageSize: 25 }))).kode).toBe('NOT_FOUND')
  })
})

describe('GET /statistik/penduduk (SPEC §6.7)', () => {
  it('operator: angka sama dengan data seed; piramida dan per dusun menjumlah ke total', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const s = await ambilStatistikPenduduk(null)
    expect(s).toMatchObject({ dusun: null, jiwa: 2812, laki: 1431, perempuan: 1381, kk: 806 })
    expect(s.piramida.reduce((t, k) => t + k.laki + k.perempuan, 0)).toBe(2812)
    expect(s.perDusun.map((b) => b.label)).toEqual([
      'Dusun I Kampung Tengah', 'Dusun II Sialang Jaya', 'Dusun III Teluk Rengas', 'Dusun IV Sungai Lamo',
    ])
    expect(s.perDusun.reduce((t, b) => t + b.jumlah, 0)).toBe(2812)
    expect(s.pekerjaan.length).toBeLessThanOrEqual(12)
  })

  it('satu dusun: jiwa sama dengan daftar penduduk dusun itu; tanpa grafik per dusun', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const s = await ambilStatistikPenduduk(3)
    expect(s.dusun).toBe(3)
    expect(s.jiwa).toBe((await daftarPenduduk({ dusun: 3 })).meta.total)
    expect(s.perDusun).toEqual([])
  })

  it('Kepala Dusun II selalu mendapat dusunnya, walau meminta dusun lain (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    const s = await ambilStatistikPenduduk(1)
    expect(s.dusun).toBe(2)
    await masukSebagai(AKUN_UJI.operator)
    expect(s.jiwa).toBe((await daftarPenduduk({ dusun: 2 })).meta.total)
  })

  it('Kaur Keuangan → FORBIDDEN; dusun tidak dikenal → VALIDATION', async () => {
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(ambilStatistikPenduduk(null))).kode).toBe('FORBIDDEN')
    await masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(ambilStatistikPenduduk(9))).kode).toBe('VALIDATION')
  })
})

describe('POST /cari (SPEC §5.4)', () => {
  it('NIK lengkap → tepat satu penduduk', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await cari('1405095203918002')).penduduk.map((p) => p.nama)).toEqual(['Siti Rahmah'])
  })

  it('nama: paling banyak 5 per jenis, semuanya cocok', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const h = await cari('siti')
    expect(h.penduduk.length).toBeGreaterThan(0)
    expect(h.penduduk.length).toBeLessThanOrEqual(5)
    expect(h.penduduk.every((p) => p.nama.toLowerCase().includes('siti'))).toBe(true)
  })

  it('nomor KK → keluarga dan seluruh anggotanya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const h = await cari('1405092011238004')
    expect(h.keluarga.map((k) => k.id)).toEqual(['kk_syahrial'])
    expect(h.penduduk).toHaveLength(4)
  })

  it('kata terlalu pendek → kosong', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect(await cari('s')).toEqual({ penduduk: [], keluarga: [], surat: [] })
  })

  it('Kaur Keuangan tidak berhak melihat penduduk → kosong', async () => {
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    expect(await cari('1405095203918002')).toEqual({ penduduk: [], keluarga: [], surat: [] })
  })

  it('Kepala Dusun II tidak menemukan warga dusun lain (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    expect((await cari('1405095203918002')).penduduk).toEqual([])
  })

  it.todo('POST /cari: nomor surat (bergaris miring) → surat itu; nama pemohon → permohonannya (menunggu surat, 8F)')
  it.todo('POST /cari: Kepala Dusun hanya mendapat surat dari dusunnya (menunggu surat, 8F; fokus review 5)')
})
