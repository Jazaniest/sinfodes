// Kembaran dari apps/web/src/mocks/handlers/{mutasi,mutasi-pindah-datang,laporan}.test.ts untuk bagian 8E2: pertanyaan yang sama
// diajukan ke server sungguhan lewat `panggilApi` dan modul `api/*` web yang sama, dan jawabannya harus sama dengan API tiruan.
// Butir yang membaca "Buku hari ini" atau mutasi lewat tiruan (`ambilDb()`) diperiksa lewat SQL karena Buku hari ini dibaca
// beranda (8G); butir yang membaca `beranda.tindakan` menunggu beranda (8G) dan tidak disalin. Dua butir kependudukan.test.ts
// yang menunggu mutasi (riwayat bayi termuda, preset pendatang) ada di kependudukan-lanjutan.test.ts.
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluarga, daftarKeluarga } from '@/api/keluarga'
import { ambilLaporan, daftarLaporan, terapkanLaporan, tolakLaporan } from '@/api/laporan'
import { ambilRingkasanMutasi, catatDatang, catatLahir, catatMeninggal, catatPindah, daftarMutasi } from '@/api/mutasi'
import { ambilPenduduk, ambilRingkasanPenduduk, ambilRiwayatPenduduk, daftarPenduduk } from '@/api/penduduk'
import type { AnggotaDatang, MasukanDatang, MasukanLahir, MasukanMeninggal, MasukanPindah } from '@/domain/mutasi/masukan'
import { buatNik } from '@/domain/penduduk/nik'
import { AKUN_UJI } from '@sinfodes/demo/uji-akun'
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
const aktivitasTerbaru = async (jenis: string) => (await sql()`select ringkasan from aktivitas where jenis = ${jenis} order by waktu desc, id desc limit 1`)[0]?.ringkasan as string | undefined
const jumlahMutasi = async (): Promise<number> => Number((await sql()`select count(*)::int as n from mutasi`)[0].n)

const LAHIR: MasukanLahir = {
  ibuId: 'pdk_siti_rahmah', ayahId: 'pdk_syahrial', pelapor: 'Syahrial',
  bayi: {
    nama: 'Aisyah Putri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15', tempatDilahirkan: 'Puskesmas',
    jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49,
  },
}
const LAHIR_LAPORAN: MasukanLahir = {
  ibuId: 'pdk_rosnani', ayahId: 'pdk_zulkifli', pelapor: 'Zulkifli', laporanId: 'lap_kelahiran_rosnani',
  bayi: { ...LAHIR.bayi, nama: 'Nayla Safitri', tanggalLahir: '2026-09-21', jam: '05:20', beratGram: 3050 },
}
const MENINGGAL: MasukanMeninggal = {
  pendudukId: 'pdk_syahrial', tanggal: '2026-09-23', jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua', yangMenerangkan: 'Tenaga kesehatan',
  pelapor: 'Siti Rahmah', penggantiKepalaId: null,
}
const TUJUAN = { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: 'Jl. Garuda Sakti' }
const PINDAH: MasukanPindah = { pendudukIds: ['pdk_nur_aini'], tanggal: '2026-09-22', tujuan: TUJUAN, alasan: 'Pendidikan', penggantiKepalaId: null }
function anggota(ubah: Partial<AnggotaDatang>): AnggotaDatang {
  return {
    nik: buatNik({ kodeWilayah: '331001', tanggalLahir: '1988-05-12', jenisKelamin: 'L', nomorUrut: 9871 }),
    nama: 'Sutrisno', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu', agama: 'Islam', kewarganegaraan: 'WNI', tempatLahir: 'Klaten', tanggalLahir: '1988-05-12',
    nomorAktaLahir: null, hubunganKeluarga: 'Kepala Keluarga', namaAyah: '', namaIbu: '', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Wiraswasta',
    statusPerkawinan: 'Kawin Tercatat', ktpEl: 'Sudah rekam', telepon: null, catatan: null, ...ubah,
  }
}
const DATANG: MasukanDatang = {
  nomorSkpwni: '3310/SKPWNI/2026/0042', asal: { provinsi: 'Jawa Tengah', kabupaten: 'Klaten', kecamatan: 'Wedi', desa: 'Pandes', alamat: '' }, tanggal: '2026-09-22',
  keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' }, statusPenduduk: 'Tetap',
  anggota: [
    anggota({}),
    anggota({ nik: buatNik({ kodeWilayah: '331001', tanggalLahir: '1990-07-03', jenisKelamin: 'P', nomorUrut: 9872 }), nama: 'Suparmi', jenisKelamin: 'P', tanggalLahir: '1990-07-03', hubunganKeluarga: 'Istri', pekerjaan: 'Mengurus Rumah Tangga' }),
  ],
}

describe('GET /mutasi (mutasi.test.ts)', () => {
  it('ringkasan bulan berjalan: 3 lahir, 1 meninggal, 2 datang, 4 pindah', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect(await ambilRingkasanMutasi('2026-09')).toEqual({ bulan: '2026-09', lahir: 3, meninggal: 1, pindah: 4, datang: 2 })
  })
  it('daftar per bulan dan jenis, terbaru dulu, beserta nama penduduknya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const bulanIni = await daftarMutasi({ bulan: '2026-09' })
    expect(bulanIni.meta.total).toBe(10)
    const tanggal = bulanIni.data.map((b) => b.mutasi.tanggal)
    expect(tanggal).toEqual([...tanggal].sort().reverse())
    expect(bulanIni.data.every((b) => b.penduduk.length === b.mutasi.pendudukIds.length)).toBe(true)
    expect((await daftarMutasi({ bulan: '2026-09', jenis: 'lahir' })).meta.total).toBe(3)
  })
  it('Kepala Dusun hanya melihat mutasi dusunnya', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    const { data } = await daftarMutasi({ pageSize: 100 })
    expect(data.length).toBeGreaterThan(0)
    for (const b of data) {
      const dusun = await sql()`select dusun_id from penduduk where id = any(${b.penduduk.map((p) => p.id)})`
      expect(dusun.some((d) => d.dusun_id === 'dsn_ss_2')).toBe(true)
    }
  })
})

describe('POST /mutasi/lahir (mutasi.test.ts)', () => {
  it('bayi tanpa NIK masuk ke KK ibunya; tercatat di Buku Mutasi, Riwayat, dan aktivitas', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { mutasi, penduduk } = await catatLahir(LAHIR)
    const [bayi] = penduduk
    expect(bayi).toMatchObject({
      nik: null, keluargaId: 'kk_syahrial', hubunganKeluarga: 'Anak', namaIbu: 'Siti Rahmah', namaAyah: 'Syahrial', statusDasar: 'Hidup', ktpEl: 'Belum wajib',
    })
    expect(mutasi).toMatchObject({ jenis: 'lahir', tanggal: '2026-09-20', pendudukIds: [bayi.id] })
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(5)
    expect((await ambilRingkasanMutasi('2026-09')).lahir).toBe(4)
    expect((await ambilRiwayatPenduduk(bayi.id)).map((e) => e.jenis)).toEqual(['mutasi'])
    expect(await aktivitasTerbaru('mutasi-lahir')).toBe('Kelahiran dicatat · Aisyah Putri')
  })
  it('ibu harus perempuan yang masih hidup', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatLahir({ ...LAHIR, ibuId: 'pdk_syahrial' }))
    expect(galat.fields.ibuId).toMatch(/perempuan yang masih hidup/)
  })
  it('tanggal lahir setelah hari ini ditolak', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatLahir({ ...LAHIR, bayi: { ...LAHIR.bayi, tanggalLahir: '2026-09-25' } }))
    expect(galat.fields['bayi.tanggalLahir']).toBe('Tanggal lahir tidak boleh setelah hari ini')
  })
})

describe('POST /mutasi/meninggal (mutasi.test.ts)', () => {
  it('kepala keluarga meninggal: pengganti wajib dipilih', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatMeninggal(MENINGGAL))
    expect(galat.fields.penggantiKepalaId).toMatch(/Pilih kepala keluarga pengganti/)
  })
  it('status Meninggal, keluar dari KK, pengganti jadi kepala; jiwa berkurang', async () => {
    await masukSebagai(AKUN_UJI.operator)
    await catatMeninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' })
    expect((await ambilPenduduk('pdk_syahrial')).statusDasar).toBe('Meninggal')
    const { keluarga, anggota: anggotaKk } = await ambilKeluarga('kk_syahrial')
    expect(keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(anggotaKk.map((a) => a.id)).not.toContain('pdk_syahrial')
    expect(anggotaKk[0]).toMatchObject({ id: 'pdk_siti_rahmah', hubunganKeluarga: 'Kepala Keluarga' })
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2811)
  })
  it('dicatat dua kali: ditolak, tidak membuat mutasi ganda', async () => {
    await masukSebagai(AKUN_UJI.operator)
    await catatMeninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' })
    const jumlah = await jumlahMutasi()
    const galat = await galatDari(catatMeninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' }))
    expect(galat.fields.pendudukId).toBe('Syahrial sudah berstatus Meninggal')
    expect(await jumlahMutasi()).toBe(jumlah)
  })
  it('Kepala Desa dan Kepala Dusun ditolak', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(catatLahir(LAHIR))).kode).toBe('FORBIDDEN')
      expect((await galatDari(catatMeninggal(MENINGGAL))).kode).toBe('FORBIDDEN')
    }
  })
})

describe('POST /mutasi/pindah (mutasi-pindah-datang.test.ts)', () => {
  it('satu anggota pindah: status Pindah, keluar dari KK', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { mutasi } = await catatPindah(PINDAH)
    expect(mutasi).toMatchObject({ jenis: 'pindah', rincian: { tujuan: TUJUAN, alasan: 'Pendidikan' } })
    expect((await ambilPenduduk('pdk_nur_aini')).statusDasar).toBe('Pindah')
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(3)
    expect(await aktivitasTerbaru('mutasi-pindah')).toBe('Pindah keluar dicatat · Nur Aini ke Kota Pekanbaru')
  })
  it('seluruh anggota KK pindah: KK hilang dari daftar dan hitungan, detailnya tetap ada', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const semua = (await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.id)
    await catatPindah({ ...PINDAH, pendudukIds: semua })
    expect((await ambilRingkasanPenduduk()).kk).toBe(805)
    expect((await daftarKeluarga({ pageSize: 100 })).meta.total).toBe(805)
    expect((await ambilKeluarga('kk_syahrial')).anggota).toEqual([])
    expect(await aktivitasTerbaru('mutasi-pindah')).toBe('Pindah keluar dicatat · Syahrial (4 orang) ke Kota Pekanbaru')
  })
  it('kepala keluarga pindah sendiri: pengganti wajib', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatPindah({ ...PINDAH, pendudukIds: ['pdk_syahrial'] }))
    expect(galat.fields.penggantiKepalaId).toMatch(/Pilih kepala keluarga pengganti/)
  })
  it('penduduk dari KK berbeda tidak bisa pindah bersama', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const [lain] = await sql()`select id from penduduk where status_dasar = 'Hidup' and keluarga_id <> 'kk_syahrial' and dusun_id = 'dsn_ss_1' and desa_id = 'desa_sungai_sialang' limit 1`
    const galat = await galatDari(catatPindah({ ...PINDAH, pendudukIds: ['pdk_nur_aini', lain.id as string] }))
    expect(galat.fields.pendudukIds).toMatch(/KK yang sama/)
  })
  it('orang yang sudah meninggal tidak bisa dicatat pindah', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const [almarhum] = await sql()`select id, nama from penduduk where status_dasar = 'Meninggal' and desa_id = 'desa_sungai_sialang' order by id limit 1`
    const galat = await galatDari(catatPindah({ ...PINDAH, pendudukIds: [almarhum.id as string] }))
    expect(galat.fields.pendudukIds).toBe(`${almarhum.nama as string} sudah berstatus Meninggal`)
  })
})

describe('POST /mutasi/datang (mutasi-pindah-datang.test.ts)', () => {
  it('KK baru dengan NIK asal; muncul di preset "Pendatang tahun ini"', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { mutasi, penduduk } = await catatDatang(DATANG)
    expect(penduduk.map((p) => p.nik)).toEqual(DATANG.anggota.map((a) => a.nik))
    expect(penduduk.every((p) => p.statusPenduduk === 'Tetap' && p.dusunId === 'dsn_ss_3')).toBe(true)
    if (mutasi.jenis !== 'datang') throw new Error('Jenis mutasi salah')
    const { keluarga } = await ambilKeluarga(mutasi.rincian.keluargaId)
    expect(keluarga.kepalaKeluargaId).toBe(penduduk[0].id)
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
    const pendatang = await daftarPenduduk({ preset: 'pendatang-tahun-ini', pageSize: 100 })
    expect(pendatang.data.map((p) => p.id)).toEqual(expect.arrayContaining(penduduk.map((p) => p.id)))
    expect(await aktivitasTerbaru('mutasi-datang')).toBe('Kedatangan dicatat · Sutrisno (2 orang)')
  })
  it('NIK yang sudah terdaftar ditolak per anggota', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatDatang({ ...DATANG, anggota: [DATANG.anggota[0], anggota({ nik: '1405095203918002', hubunganKeluarga: 'Istri' })] }))
    expect(galat.kode).toBe('CONFLICT')
    expect(galat.fields['anggota.1.nik']).toBe('NIK sudah terdaftar atas nama Siti Rahmah')
  })
  it('KK baru harus punya tepat satu kepala keluarga', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const tanpaKepala = DATANG.anggota.map((a) => ({ ...a, hubunganKeluarga: 'Famili Lain' as const }))
    const galat = await galatDari(catatDatang({ ...DATANG, anggota: tanpaKepala }))
    expect(galat.fields.anggota).toBe('KK baru harus punya tepat satu kepala keluarga')
  })
  it('Kepala Dusun ditolak', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(catatDatang(DATANG))).kode).toBe('FORBIDDEN')
    expect((await galatDari(catatPindah(PINDAH))).kode).toBe('FORBIDDEN')
  })
})

describe('laporan data warga (laporan.test.ts)', () => {
  it('daftar laporan baru, terlama dulu; bisa disaring per penduduk', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await daftarLaporan({ status: 'baru' })).data.map((l) => l.id)).toEqual(['lap_pekerjaan_syahrial', 'lap_kelahiran_rosnani'])
    expect((await daftarLaporan({ jenis: 'perbaikan', pendudukId: 'pdk_syahrial' })).data).toHaveLength(1)
    expect((await daftarLaporan({ pendudukId: 'pdk_siti_rahmah' })).data).toHaveLength(0)
  })
  it('Terapkan: data berubah, Riwayat mencatat petugas, laporan selesai; Terapkan lagi: CONFLICT', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { laporan, penduduk } = await terapkanLaporan('lap_pekerjaan_syahrial')
    expect(penduduk.pekerjaan).toBe('Wiraswasta')
    expect(laporan).toMatchObject({ status: 'diterapkan', ditangani: { oleh: { nama: 'Rosmiati' }, alasan: null } })
    expect(await ambilRiwayatPenduduk('pdk_syahrial')).toContainEqual(
      expect.objectContaining({ jenis: 'ubah', field: 'pekerjaan', nilaiLama: 'Nelayan/Perikanan', nilaiBaru: 'Wiraswasta' }),
    )
    expect((await galatDari(terapkanLaporan('lap_pekerjaan_syahrial'))).kode).toBe('CONFLICT')
  })
  it('Tolak dengan alasan; sesudahnya tidak bisa diterapkan dan data tidak berubah', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const { laporan } = await tolakLaporan('lap_pekerjaan_syahrial', 'Masih tercatat di kelompok nelayan.')
    expect(laporan).toMatchObject({ status: 'ditolak', ditangani: { alasan: 'Masih tercatat di kelompok nelayan.' } })
    expect((await galatDari(terapkanLaporan('lap_pekerjaan_syahrial'))).kode).toBe('CONFLICT')
    expect((await ambilPenduduk('pdk_syahrial')).pekerjaan).toBe('Nelayan/Perikanan')
  })
  it('peran tanpa hak ubah: FORBIDDEN; laporan kelahiran tidak bisa diterapkan langsung', async () => {
    await masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(terapkanLaporan('lap_pekerjaan_syahrial'))).kode).toBe('FORBIDDEN')
    expect((await galatDari(tolakLaporan('lap_pekerjaan_syahrial', null))).kode).toBe('FORBIDDEN')
    await masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(terapkanLaporan('lap_kelahiran_rosnani'))).kode).toBe('VALIDATION')
  })
  it('Kepala Dusun II tidak melihat laporan dari dusun lain', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    expect((await daftarLaporan({})).data).toEqual([])
  })
  it('Catat kelahiran dari laporan: laporan selesai dan tidak bisa dipakai lagi', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const hasil = await catatLahir(LAHIR_LAPORAN)
    expect(hasil.penduduk[0]).toMatchObject({ nama: 'Nayla Safitri', keluargaId: 'kk_zulkifli' })
    expect((await ambilLaporan('lap_kelahiran_rosnani')).status).toBe('diterapkan')
    expect((await galatDari(catatLahir(LAHIR_LAPORAN))).kode).toBe('CONFLICT')
  })
})

describe('kunci idempotensi (rencana 8E2 Tugas 8, khusus server)', () => {
  it('Perbedaan sengaja: tiruan mengabaikan Idempotency-Key; server mengembalikan hasil pertama dan tidak mencatat dua kali', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sebelum = await jumlahMutasi()
    const a = await catatLahir(LAHIR, 'kunci-konformansi-0001')
    const b = await catatLahir(LAHIR, 'kunci-konformansi-0001')
    expect(b).toEqual(a)
    expect(await jumlahMutasi()).toBe(sebelum + 1)
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(5)
  })
  it('kunci yang sama dengan isian berbeda: CONFLICT', async () => {
    await masukSebagai(AKUN_UJI.operator)
    await catatLahir(LAHIR, 'kunci-konformansi-0002')
    const galat = await galatDari(catatLahir({ ...LAHIR, bayi: { ...LAHIR.bayi, nama: 'Bayi Lain' } }, 'kunci-konformansi-0002'))
    expect(galat.kode).toBe('CONFLICT')
    expect(galat.message).toBe('Kunci idempotensi ini sudah dipakai untuk isian yang berbeda.')
  })
})
