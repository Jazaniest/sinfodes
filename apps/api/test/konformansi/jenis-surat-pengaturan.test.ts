// Kembaran dari apps/web/src/mocks/handlers/{jenis-surat,tata-letak,pengaturan}.test.ts untuk bagian 8F1: pertanyaan yang sama
// diajukan ke server sungguhan lewat `panggilApi` dan modul `api/*` web yang sama, dan jawabannya harus sama dengan API tiruan.
// Butir yang bergantung pada permohonan (pemakaian jenis, surat terbit, pembekuan tata letak, nomor terbit) menunggu 8F2 dan
// ditulis sebagai `it.todo`; butir yang bergantung pada Identitas desa dan lambang (`PUT /pengaturan/desa`) menunggu 8G/8H.
// Perbedaan yang sudah diputuskan ditandai `Perbedaan sengaja:` pada butirnya.
import { describe, expect, it } from 'vitest'
import { panggilApi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { ambilPenomoran, simpanPenomoran } from '@/api/pengaturan'
import {
  aktifkanLagiJenisSurat, ambilJenisSurat, arsipkanJenisSurat, daftarJenisSurat, hapusJenisSurat, tambahJenisSurat, ubahJenisSurat,
} from '@/api/surat'
import { ambilTataLetak, simpanTataLetak } from '@/api/tata-letak'
import { pengaturanBawaan } from '@/domain/surat/pengaturan-bawaan'
import { tataLetakSuratSchema, type TataLetakSurat } from '@/domain/surat/tata-letak'
import { salinTataLetak, TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import type { UbahJenisSurat } from '@/domain/surat/ubah-jenis'
import { AKUN_DESA_BARU_UJI, AKUN_UJI } from '@sinfodes/demo/uji-akun'
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

const sql = () => api.uji.sqlMigrasi
const PESAN_TIDAK_ADA = 'Jenis surat tidak ditemukan.'
const jenisBaru = (kode = 'SPK') => tambahJenisSurat({ dari: null, kode, nama: 'Surat Pengantar Kerja' })
const rataTengahArimo = (): TataLetakSurat => {
  const t = salinTataLetak(TATA_LETAK_SIAP['rata-tengah'])
  t.huruf.keluarga = 'Arimo'
  t.siap = null
  return t
}
const tataLetakSs = async () => (await sql()`select tata_letak from pengaturan_surat where desa_id = 'desa_sungai_sialang'`)[0].tata_letak as TataLetakSurat

describe('jenis surat: detail dan ubah (jenis-surat.test.ts)', () => {
  it('detail: jumlah pakai sama dengan daftar; pejabat dari akun aktif', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_skd')
    expect(d.jenis.jumlahPakai).toBe((await daftarJenisSurat()).data.find((j) => j.id === 'js_ss_skd')?.jumlahPakai)
    expect(d.pejabat.kades).toBe('H. Muhammad Nasir')
  })
  // Perbedaan sengaja: tiruan memakai permohonan terakhir jenis itu; server selalu memakai pemohon contoh tanpa NIK (rencana 8F1 Ruling 4).
  it('Perbedaan sengaja: contoh pratinjau selalu pemohon contoh tanpa NIK, juga di desa yang punya penduduk', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_skd')
    expect(d.contoh).toMatchObject({ tiruan: true, pemohon: { nama: 'Nama Pemohon', nik: null, desaId: 'desa_sungai_sialang' }, subjek: null, mutasi: null, isian: {} })
  })
  it('ubah teks dan klasifikasi: tersimpan dengan spasi tepi dibuang', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const teks = 'Benar penduduk Desa [namaDesa] yang tinggal di [alamat].\n\nUntuk keperluan [keperluan].'
    const d = await ubahJenisSurat('js_ss_skd', { teks, klasifikasi: ' 470.1 ' })
    expect(d.jenis).toMatchObject({ teks, klasifikasi: '470.1' })
    expect((await ambilJenisSurat('js_ss_skd')).jenis).toMatchObject({ teks, klasifikasi: '470.1' })
  })
  it('teks tidak sah ditolak per kolom dan tidak tersimpan (fokus review 3)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_sktm')
    const g = await galatDari(ubahJenisSurat('js_ss_sktm', { isian: d.jenis.isian.filter((x) => x.kunci !== 'instansiTujuan') }))
    expect(g.kode).toBe('VALIDATION')
    expect(g.fields).toEqual({ teks: 'Sisipan [instansiTujuan] tidak dikenal. Hapus, atau tambahkan isiannya lebih dulu.' })
    expect((await ambilJenisSurat('js_ss_sktm')).jenis.isian).toHaveLength(3)
  })
  it('isian dirapikan: label dan pilihan tanpa spasi tepi, pilihan kosong dibuang', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_sktm')
    const [keperluan, ...lain] = d.jenis.isian
    const hasil = await ubahJenisSurat('js_ss_sktm', {
      isian: [{ ...keperluan, label: ' Keperluan ', pilihan: [' Pendidikan', 'Kesehatan ', '', 'Lainnya'] }, ...lain],
      syarat: [' KTP ', 'KK'],
    })
    expect(hasil.jenis.isian[0]).toMatchObject({ label: 'Keperluan', pilihan: ['Pendidikan', 'Kesehatan', 'Lainnya'] })
    expect(hasil.jenis.syarat).toEqual(['KTP', 'KK'])
  })
  it('hanya Operator dan Sekdes yang boleh mengubah; kode tidak bisa diubah (fokus review 5)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(ubahJenisSurat('js_ss_skd', { aktif: false }))).kode).toBe('FORBIDDEN')
    }
    await masukSebagai(AKUN_UJI.sekdes)
    const d = await ubahJenisSurat('js_ss_skd', { kode: 'XYZ', online: false } as UbahJenisSurat)
    expect(d.jenis).toMatchObject({ kode: 'SKD', online: false })
  })
  it('nonaktif: jenis ikut mati di daftar dan status dihentikan', async () => {
    await masukSebagai(AKUN_UJI.operator)
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    expect((await daftarJenisSurat(undefined, 'dihentikan')).data.map((j) => j.kode)).toEqual(['SKD'])
  })
})

describe('jenis surat desa baru (jenis-surat.test.ts, tahap 6C)', () => {
  it('Tanjung Lamo: 12 jenis bawaan, semuanya belum dilayani', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    const { data } = await daftarJenisSurat()
    expect(data).toHaveLength(12)
    expect(data.every((j) => !j.aktif && j.id.startsWith('js_tanjung_lamo_') && j.jumlahPakai === 0)).toBe(true)
  })
  it('mengaktifkan jenis surat tanpa penduduk: pratinjau memakai pemohon contoh tanpa NIK (fokus review 1)', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    const d = await ubahJenisSurat('js_tanjung_lamo_sktm', { aktif: true })
    expect(d.jenis.aktif).toBe(true)
    expect(d.contoh).toMatchObject({ tiruan: true, pemohon: { nama: 'Nama Pemohon', nik: null, desaId: 'desa_tanjung_lamo' }, subjek: null })
    expect((await ambilJenisSurat('js_tanjung_lamo_skl')).contoh.tiruan).toBe(true)
  })
  it('jenis surat desa lain tidak bisa dibuka atau diubah (fokus review 1)', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await galatDari(ambilJenisSurat('js_ss_skd'))).kode).toBe('NOT_FOUND')
    expect((await galatDari(ubahJenisSurat('js_ss_skd', { aktif: false }))).kode).toBe('NOT_FOUND')
    expect((await sql()`select aktif from jenis_surat where id = 'js_ss_skd'`)[0].aktif).toBe(true)
  })
})

describe('jenis surat buatan desa: tambah (jenis-surat.test.ts, SPEC-V0.2 12.1)', () => {
  it('dari kosong: asal desa, mati, belum diarsipkan, isi awal sesuai keputusan 2', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: ' Surat Pengantar Kerja ' })
    expect(j).toMatchObject({
      kode: 'SPK', nama: 'Surat Pengantar Kerja', asal: 'desa', aktif: false, diarsipkan: null, desaId: 'desa_sungai_sialang',
      klasifikasi: '470', subjek: 'pemohon', syarat: ['KTP-el pemohon'], isian: [],
    })
    expect((await ambilJenisSurat(j.id)).jenis).toMatchObject({ kode: 'SPK', dipakai: false, jumlahPakai: 0 })
  })
  it('salin dari SKTM: isian dan teks sama; mengubah salinan tidak mengubah sumber (fokus review 5)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sumber = (await ambilJenisSurat('js_ss_sktm')).jenis
    const salinan = await tambahJenisSurat({ dari: 'js_ss_sktm', kode: 'SKTK', nama: 'Surat Keterangan Tidak Kuat' })
    expect(salinan).toMatchObject({ asal: 'desa', aktif: false, diarsipkan: null, isian: sumber.isian, teks: sumber.teks, syarat: sumber.syarat })
    expect(salinan.id).not.toBe('js_ss_sktm')
    await ubahJenisSurat(salinan.id, { teks: 'Teks salinan [nama].', syarat: ['KTP'] })
    expect((await ambilJenisSurat('js_ss_sktm')).jenis).toEqual(sumber)
  })
  it('salin dari jenis arsip diizinkan; hasilnya tidak ikut diarsipkan', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const asal = await jenisBaru()
    await arsipkanJenisSurat(asal.id)
    const salinan = await tambahJenisSurat({ dari: asal.id, kode: 'SPKB', nama: 'Surat Pengantar Kerja Baru' })
    expect(salinan).toMatchObject({ diarsipkan: null, aktif: false, asal: 'desa' })
  })
  it('kode ganda dengan jenis aktif, mati, maupun arsip → 422 persis (fokus review 3)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const arsip = await tambahJenisSurat({ dari: null, kode: 'ARS', nama: 'Surat Arsip' })
    await arsipkanJenisSurat(arsip.id)
    for (const kode of ['SKD', 'ARS']) {
      const g = await galatDari(tambahJenisSurat({ dari: null, kode, nama: 'Surat Lain' }))
      expect(g).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kode: 'Kode sudah dipakai jenis surat lain.' } })
    }
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    expect((await galatDari(tambahJenisSurat({ dari: null, kode: 'SKD', nama: 'Surat Lain' }))).fields).toEqual({ kode: 'Kode sudah dipakai jenis surat lain.' })
  })
  it('kode dipakai per desa: desa lain memakai kode yang tidak ada di katalognya', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await galatDari(tambahJenisSurat({ dari: null, kode: 'SKD', nama: 'Surat Domisili' }))).fields).toEqual({ kode: 'Kode sudah dipakai jenis surat lain.' })
    const j = await jenisBaru()
    expect(j.desaId).toBe('desa_tanjung_lamo')
  })
  it('kode dan nama tidak sah ditolak per kolom; sumber salinan milik desa lain atau tidak ada → 404', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(tambahJenisSurat({ dari: null, kode: 'ab', nama: ' ' }))
    expect(g).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kode: 'Kode 2-5 huruf kapital.', nama: 'Nama jenis surat wajib diisi.' } })
    for (const dari of ['js_tanjung_lamo_skd', 'js_tidak_ada']) {
      expect(await galatDari(tambahJenisSurat({ dari, kode: 'SPK', nama: 'Surat Pengantar Kerja' }))).toMatchObject({
        kode: 'NOT_FOUND', status: 404, message: PESAN_TIDAK_ADA,
      })
    }
    expect(Number((await sql()`select count(*)::int as n from jenis_surat where kode = 'SPK'`)[0].n)).toBe(0)
  })
  it('hanya Operator dan Sekdes; Kades dan Kepala Dusun → 403', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(jenisBaru())).kode).toBe('FORBIDDEN')
    }
    await masukSebagai(AKUN_UJI.sekdes)
    expect((await jenisBaru()).asal).toBe('desa')
  })
})

describe('jenis surat buatan desa: hapus, arsipkan, aktifkan lagi (jenis-surat.test.ts, SPEC-V0.2 12.1)', () => {
  it('hapus jenis desa yang belum dipakai → hilang; GET sesudahnya 404', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const j = await jenisBaru()
    await hapusJenisSurat(j.id)
    expect((await galatDari(ambilJenisSurat(j.id))).kode).toBe('NOT_FOUND')
    expect(Number((await sql()`select count(*)::int as n from jenis_surat where id = ${j.id}`)[0].n)).toBe(0)
  })
  it('hapus jenis bawaan → 422 dan tetap ada', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect(await galatDari(hapusJenisSurat('js_ss_skd'))).toMatchObject({ kode: 'VALIDATION', status: 422, message: 'Jenis bawaan tidak bisa dihapus atau diarsipkan.' })
    expect(Number((await sql()`select count(*)::int as n from jenis_surat where id = 'js_ss_skd'`)[0].n)).toBe(1)
  })
  it('arsipkan: diarsipkan terisi, mati, PATCH sesudahnya → 409; jenis bawaan tak bisa diarsipkan', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const j = await jenisBaru()
    await ubahJenisSurat(j.id, { aktif: true })
    const arsip = await arsipkanJenisSurat(j.id)
    expect(arsip.diarsipkan).toMatch(/^2026-09-24T/)
    expect(arsip.aktif).toBe(false)
    expect(await galatDari(ubahJenisSurat(j.id, { nama: 'Nama Baru' }))).toMatchObject({
      kode: 'CONFLICT', status: 409, message: 'Jenis ini diarsipkan. Aktifkan lagi sebelum mengubahnya.',
    })
    expect((await sql()`select nama from jenis_surat where id = ${j.id}`)[0].nama).toBe('Surat Pengantar Kerja')
    expect(await galatDari(arsipkanJenisSurat('js_ss_skd'))).toMatchObject({ kode: 'VALIDATION', status: 422, message: 'Jenis bawaan tidak bisa dihapus atau diarsipkan.' })
    expect((await galatDari(arsipkanJenisSurat(j.id))).status).toBe(409)
  })
  it('aktifkan lagi: diarsipkan null dan aktif tetap false; boleh diubah lagi', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const j = await jenisBaru()
    await arsipkanJenisSurat(j.id)
    expect(await aktifkanLagiJenisSurat(j.id)).toMatchObject({ diarsipkan: null, aktif: false })
    expect((await ubahJenisSurat(j.id, { nama: 'Nama Baru' })).jenis.nama).toBe('Nama Baru')
    expect((await galatDari(aktifkanLagiJenisSurat(j.id))).status).toBe(409)
  })
  it('jenis desa lain atau tidak ada → 404 untuk hapus, arsipkan, aktifkan lagi', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    for (const aksi of [hapusJenisSurat, arsipkanJenisSurat, aktifkanLagiJenisSurat]) {
      expect(await galatDari(aksi('js_ss_skd'))).toMatchObject({ kode: 'NOT_FOUND', status: 404, message: PESAN_TIDAK_ADA })
    }
    expect(Number((await sql()`select count(*)::int as n from jenis_surat where id = 'js_ss_skd'`)[0].n)).toBe(1)
  })
  it('Kades dan Kepala Dusun → 403 untuk hapus, arsipkan, aktifkan lagi', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const j = await jenisBaru()
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      for (const aksi of [hapusJenisSurat, arsipkanJenisSurat, aktifkanLagiJenisSurat]) expect((await galatDari(aksi(j.id))).kode).toBe('FORBIDDEN')
    }
  })
  // Perbedaan sengaja: jumlah dan "dipakai" nol sampai tabel permohonan ada (rencana 8F1 Ruling 7).
  it('Perbedaan sengaja: jumlahPakai nol dan dipakai false pada setiap jenis sampai 8F2', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarJenisSurat()
    expect(data.every((j) => j.jumlahPakai === 0 && !j.dipakai)).toBe(true)
  })
  it.todo('8F2: hapus jenis desa yang sudah dipakai permohonan → 409 "Jenis ini sudah pernah dipakai. Arsipkan saja." (jenis-surat.test.ts)')
  it.todo('8F2: daftar jenis memuat dipakai dan jumlahPakai menurut permohonan; SKD dipakai (jenis-surat.test.ts)')
  it.todo('8F2: jenis arsip tidak bisa membuat permohonan baru dari loket; permohonan yang berjalan tetap bisa diselesaikan dan surat terbitnya bisa diverifikasi')
  it.todo('8F2: ubah teks jenis tidak mengubah surat yang sudah terbit; isian wajib baru menahan tanda tangan sampai dilengkapi')
})

describe('daftar jenis surat: penyaring status (jenis-surat.test.ts, SPEC-V0.2 12.1 butir 6)', () => {
  it('?status memilah aktif, dihentikan, dan diarsipkan; tanpa status memuat semuanya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const arsip = await tambahJenisSurat({ dari: null, kode: 'ARS', nama: 'Surat Arsip' })
    await arsipkanJenisSurat(arsip.id)
    await tambahJenisSurat({ dari: null, kode: 'MTI', nama: 'Surat Mati' })
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    const kode = async (status?: 'aktif' | 'dihentikan' | 'diarsipkan') => (await daftarJenisSurat(undefined, status)).data.map((j) => j.kode).sort()
    expect(await kode('diarsipkan')).toEqual(['ARS'])
    expect(await kode('dihentikan')).toEqual(['MTI', 'SKD'])
    expect(await kode('aktif')).not.toContain('SKD')
    expect((await kode('aktif')).length).toBe(11)
    expect((await kode()).length).toBe(14)
  })
  it('status tidak dikenal → 422 pada field status', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(daftarJenisSurat(undefined, 'salah' as never))
    expect(g).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { status: 'Status jenis surat tidak dikenal.' } })
  })
})

describe('GET dan PUT /surat/tata-letak (tata-letak.test.ts)', () => {
  it('Sekdes menyimpan rata-tengah; GET mengembalikan yang sama dengan penanda siap', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    expect(await ambilTataLetak()).toEqual(TATA_LETAK_SIAP.standar)
    expect(await simpanTataLetak(TATA_LETAK_SIAP['rata-tengah'])).toEqual(TATA_LETAK_SIAP['rata-tengah'])
    expect(await ambilTataLetak()).toEqual(TATA_LETAK_SIAP['rata-tengah'])
    expect((await tataLetakSs()).siap).toBe('rata-tengah')
  })
  it('Operator boleh; Kades, Kaur Keuangan, dan Kepala Dusun → 403', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await simpanTataLetak(rataTengahArimo())).huruf.keluarga).toBe('Arimo')
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(ambilTataLetak())).status).toBe(403)
      expect((await galatDari(simpanTataLetak(TATA_LETAK_SIAP.standar))).status).toBe(403)
    }
    expect((await tataLetakSs()).huruf.keluarga).toBe('Arimo')
  })
  it('Review Focus 4: tanpa qr, qr.posisi "tidak-ada", atau kunci sembunyikanNomor → 422 dan tidak tersimpan', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const tanpaQr: Partial<TataLetakSurat> = salinTataLetak(TATA_LETAK_SIAP.standar)
    delete tanpaQr.qr
    const kirim = (body: unknown) => galatDari(panggilApi('PUT', '/surat/tata-letak', { skema: tataLetakSuratSchema, body }))
    for (const body of [tanpaQr, { ...TATA_LETAK_SIAP.standar, qr: { posisi: 'tidak-ada' } }, { ...TATA_LETAK_SIAP.standar, sembunyikanNomor: true }]) {
      expect(await kirim(body)).toMatchObject({ kode: 'VALIDATION', status: 422 })
    }
    expect(await tataLetakSs()).toEqual(TATA_LETAK_SIAP.standar)
  })
  it('isian salah: pesan persis per kolom', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const t = salinTataLetak(TATA_LETAK_SIAP.standar)
    t.kertas.margin.kiri = 41
    t.kop.baris = ['x'.repeat(81)]
    t.tandaTangan.urutan = ['jabatan', 'nama']
    const g = await galatDari(simpanTataLetak(t))
    expect(g.fields).toEqual({
      'kertas.margin.kiri': 'Margin 10-40 mm.',
      'kop.baris.0': 'Baris kop paling banyak 80 karakter.',
      'tandaTangan.urutan': 'Tempat dan tanggal, jabatan, dan nama wajib ada di blok tanda tangan.',
    })
  })
  it('pengecualian per jenis: dibuat, tidak ikut berubah saat desa berganti, dan dikembalikan dengan tataLetak null', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    await ubahJenisSurat('js_ss_sktm', { tataLetak: TATA_LETAK_SIAP['dua-lambang'] })
    await simpanTataLetak(TATA_LETAK_SIAP['rata-tengah'])
    expect((await ambilJenisSurat('js_ss_sktm')).jenis.tataLetak?.siap).toBe('dua-lambang')
    expect((await ambilJenisSurat('js_ss_skd')).jenis.tataLetak).toBeNull()
    expect((await ubahJenisSurat('js_ss_sktm', { tataLetak: null })).jenis.tataLetak).toBeNull()
  })
  it('pengecualian per jenis dengan isi salah → 422 dan jenis tak berubah', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const salah = salinTataLetak(TATA_LETAK_SIAP.standar)
    salah.kertas.margin.atas = 5
    const g = await galatDari(ubahJenisSurat('js_ss_sktm', { tataLetak: salah }))
    expect(g).toMatchObject({ status: 422 })
    expect(g.fields).toEqual({ 'tataLetak.kertas.margin.atas': 'Margin 10-40 mm.' })
    expect((await ambilJenisSurat('js_ss_sktm')).jenis.tataLetak).toBeNull()
  })
  it('desa tanpa baris pengaturan memakai tata letak bawaan', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    await sql()`delete from pengaturan_surat where desa_id = 'desa_tanjung_lamo'`
    expect(await ambilTataLetak()).toEqual(pengaturanBawaan('desa_tanjung_lamo').tataLetak)
  })
  it.todo('8F2: tata letak dan kop dibekukan saat surat terbit; surat terbit sebelum tata letak diganti tetap memakai salinannya (tata-letak.test.ts)')
})

describe('GET dan PUT /pengaturan/penomoran (pengaturan.test.ts)', () => {
  it('Operator dan Sekdes boleh; Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.sekdes]) {
      await masukSebagai(akun)
      expect((await ambilPenomoran()).kodeSurat).toBe('SS')
    }
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(ambilPenomoran())).kode).toBe('FORBIDDEN')
    }
  })
  // Perbedaan sengaja: tiruan menghitung contoh dari surat yang sudah terbit di data demo; server belum punya tabel permohonan (Ruling 10).
  it('Perbedaan sengaja: format bawaan dan contoh nomor berikutnya = 1 sampai ada surat terbit (8F2); format kembar ditolak (fokus review 3)', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const p = await ambilPenomoran()
    expect(p).toMatchObject({ formatNomor: '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}', urutan: 'per-tahun', kodeSurat: 'SS' })
    expect(p.contoh).toMatchObject({ urutPerTahun: 1, urutPerJenis: 1 })
    const baru = await simpanPenomoran({ formatNomor: '{tahun}/{urut}/{kodeDesa}', urutan: 'per-tahun', kodeSurat: 'sl' })
    expect(baru).toMatchObject({ formatNomor: '{tahun}/{urut}/{kodeDesa}', kodeSurat: 'SL' })
    expect((await sql()`select kode_surat from desa where id = 'desa_sungai_sialang'`)[0].kode_surat).toBe('SL')
    expect(await galatDari(simpanPenomoran({ formatNomor: '{urut}/{kodeDesa}', urutan: 'per-tahun', kodeSurat: 'SS' }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { formatNomor: 'Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.' },
    })
  })
  it('penomoran per jenis surat wajib memuat kode jenis: SKTM dan SKP sama-sama berklasifikasi 400 (fokus review 3)', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    expect(await galatDari(simpanPenomoran({ formatNomor: '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}', urutan: 'per-jenis', kodeSurat: 'SS' }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { formatNomor: 'Urutan per jenis surat wajib memuat kode jenis surat, supaya nomor antar-jenis tidak kembar.' },
    })
    const baru = await simpanPenomoran({ formatNomor: '{klasifikasi}/{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis', kodeSurat: 'SS' })
    expect(baru).toMatchObject({ formatNomor: '{klasifikasi}/{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis' })
    expect(baru.contoh.kode).toMatch(/^[A-Z]+$/)
  })
  it.todo('8F2: contoh penomoran mengikuti nomor yang sudah terbit (urutPerTahun > urutPerJenis pada data demo)')
})
