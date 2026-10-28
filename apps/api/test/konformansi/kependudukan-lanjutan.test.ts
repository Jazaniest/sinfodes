// Kembaran dari apps/web/src/mocks/handlers/{kependudukan,penduduk-tulis,keluarga-tulis,pengaturan-wilayah}.test.ts untuk bagian 8E1:
// pertanyaan yang sama diajukan ke server sungguhan lewat `panggilApi` dan modul `api/*` web yang sama, dan jawabannya harus sama
// dengan API tiruan. Butir yang membaca "Buku hari ini" lewat tiruan (`ambilDb().aktivitas`) diperiksa lewat SQL karena Buku hari
// ini dibaca beranda (8G). Butir yang bergantung pada mutasi (riwayat bayi termuda, preset "Pendatang tahun ini") menunggu 8E2.
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluarga, daftarKeluarga, cariKeluarga, gantiKepala, pecahKeluarga } from '@/api/keluarga'
import { ambilPenduduk, ambilRingkasanPenduduk, ambilRiwayatPenduduk, cariPenduduk, cekNik, daftarPenduduk, tambahPenduduk, ubahPenduduk } from '@/api/penduduk'
import { ambilWilayah, simpanWilayah } from '@/api/pengaturan'
import { ambilSesi } from '@/api/sesi'
import { biodataDari, type MasukanPenduduk } from '@/domain/penduduk/masukan'
import { buatNik } from '@/domain/penduduk/nik'
import { formDariWilayah, type UbahWilayah, type WilayahDesa } from '@/domain/pengaturan/wilayah'
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
const aktivitasTerbaru = async (jenis: string) => (await sql()`select jenis, ringkasan, rujukan_jenis, rujukan_id from aktivitas where jenis = ${jenis} order by waktu desc, id desc limit 1`)[0]

describe('penduduk (lanjutan kependudukan.test.ts)', () => {
  it('mantan penduduk terbuka lewat filter status, tidak ikut jiwa, dan detailnya terbaca', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await daftarPenduduk({ status: 'Meninggal', pageSize: 100 })
    expect(r.meta.total).toBeGreaterThanOrEqual(1)
    expect(r.data.every((p) => p.statusDasar === 'Meninggal')).toBe(true)
    expect((await ambilPenduduk(r.data[0].id)).statusDasar).toBe('Meninggal')
  })

  it('riwayat: terbaru dulu, data lama diawali entri pembuatan', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const entri = await ambilRiwayatPenduduk('pdk_siti_rahmah')
    expect(entri.at(-1)?.jenis).toBe('dibuat')
    const waktu = entri.map((e) => e.waktu)
    expect(waktu).toEqual([...waktu].sort().reverse())
  })

  // Menunggu 8E2: tabel mutasi baru lahir di sana, jadi riwayat bayi termuda belum diawali mutasi lahir.
  it.todo('riwayat bayi termuda diawali mutasi lahir, tanpa entri pembuatan (8E2)')
  it.todo('preset pendatang tahun ini berisi warga yang datang di 2026 (8E2)')
})

describe('keluarga (lanjutan kependudukan.test.ts)', () => {
  it('daftar: 806 KK urut nama kepala, dengan jumlah anggota', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await daftarKeluarga({})
    expect(r.meta).toEqual({ page: 1, pageSize: 25, total: 806 })
    const nama = r.data.map((k) => k.namaKepala)
    expect(nama).toEqual([...nama].sort((a, b) => a.localeCompare(b, 'id')))
    expect(r.data.every((k) => k.jumlahAnggota === k.anggotaIds.length)).toBe(true)
  })

  it('cari nomor KK lewat POST', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await cariKeluarga('1405092011238004', {})
    expect(r.data).toHaveLength(1)
    expect(r.data[0]).toMatchObject({ id: 'kk_syahrial', namaKepala: 'Syahrial', jumlahAnggota: 4 })
  })

  it('detail: anggota urut sesuai KK', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.nama)).toEqual(['Syahrial', 'Siti Rahmah', 'Nur Aini', 'Muhammad Alif'])
  })

  it('Kaur Keuangan tidak berhak', async () => {
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    await expect(daftarKeluarga({})).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })
})

describe('cakupan Kepala Dusun II (fokus review 1, lanjutan)', () => {
  it('KK dan riwayat warga dusun lain → 404', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    await expect(ambilKeluarga('kk_syahrial')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
    await expect(ambilRiwayatPenduduk('pdk_siti_rahmah')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })

  it('daftar KK hanya dusunnya', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    const r = await daftarKeluarga({ pageSize: 100 })
    expect(r.meta.total).toBeGreaterThan(0)
    expect(r.data.every((k) => k.dusunId === 'dsn_ss_2')).toBe(true)
  })
})

const NIK_BARU = buatNik({ kodeWilayah: '140509', tanggalLahir: '2015-05-10', jenisKelamin: 'L', nomorUrut: 9876 })

async function masukanBaru(ubah: Partial<MasukanPenduduk> = {}): Promise<MasukanPenduduk> {
  return {
    ...biodataDari(await ambilPenduduk('pdk_siti_rahmah')),
    nik: NIK_BARU,
    nama: 'Fajar Ramadhan',
    jenisKelamin: 'L',
    tanggalLahir: '2015-05-10',
    hubunganKeluarga: 'Anak',
    pendidikan: 'Belum Tamat SD/Sederajat',
    pekerjaan: 'Pelajar/Mahasiswa',
    statusPerkawinan: 'Belum Kawin',
    ktpEl: 'Belum wajib',
    telepon: null,
    nomorAktaLahir: null,
    keluarga: { jenis: 'ada', id: 'kk_syahrial' },
    ...ubah,
  }
}

describe('POST /penduduk (SPEC §6.4, penduduk-tulis.test.ts)', () => {
  it('tambah ke KK yang ada: alamat ikut KK, jiwa bertambah, tercatat di Buku hari ini', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const p = await tambahPenduduk(await masukanBaru())
    expect(p).toMatchObject({ keluargaId: 'kk_syahrial', dusunId: 'dsn_ss_1', rw: '002', rt: '004', statusDasar: 'Hidup' })
    expect((await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.id)).toContain(p.id)
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2813)
    // Perbedaan sengaja: Buku hari ini dibaca beranda (8G); baris aktivitasnya diperiksa langsung di basis data.
    expect(await aktivitasTerbaru('penduduk-tambah')).toMatchObject({ ringkasan: 'Penduduk ditambahkan · Fajar Ramadhan', rujukan_jenis: 'penduduk', rujukan_id: p.id })
  })

  it('KK baru: nomor KK = kode wilayah + tanggal terbit hari ini + nomor urut, penduduknya jadi kepala', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const p = await tambahPenduduk(await masukanBaru({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' } }))
    const { keluarga } = await ambilKeluarga(p.keluargaId)
    expect(keluarga.nomorKk).toMatch(/^140509240926[89]\d{3}$/)
    expect(keluarga.kepalaKeluargaId).toBe(p.id)
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
  })

  it('KK yang sudah punya kepala tidak bisa diberi kepala kedua', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(await masukanBaru({ hubunganKeluarga: 'Kepala Keluarga' })))
    expect(galat.kode).toBe('VALIDATION')
    expect(galat.fields.hubunganKeluarga).toMatch(/sudah punya kepala keluarga/)
  })

  it('wilayah KK baru harus ada di desa', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(await masukanBaru({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_1', rw: '009', rt: '999' } })))
    expect(galat.fields.dusunId).toBe('Wilayah tidak dikenal')
  })

  it('NIK ganda → CONFLICT dengan nama pemilik (fokus review 4)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(await masukanBaru({ nik: '1405095203918002' })))
    expect(galat.kode).toBe('CONFLICT')
    expect(galat.fields.nik).toBe('NIK sudah terdaftar atas nama Siti Rahmah')
  })

  it('NIK milik mantan penduduk juga dianggap ganda (fokus review 4)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    let nik: string | null = null
    for (const m of (await daftarPenduduk({ status: 'Meninggal', pageSize: 100 })).data) {
      nik = (await ambilPenduduk(m.id)).nik
      if (nik) break
    }
    if (!nik) throw new Error('Data semai harus punya mantan penduduk ber-NIK')
    expect((await galatDari(tambahPenduduk(await masukanBaru({ nik })))).kode).toBe('CONFLICT')
  })

  it('isian tidak valid → VALIDATION dengan rincian per field', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(await masukanBaru({ nama: '' })))
    expect(galat.kode).toBe('VALIDATION')
    expect(galat.fields.nama).toBe('Nama lengkap wajib diisi')
  })

  it('Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const masukan = await masukanBaru()
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(tambahPenduduk(masukan))).kode).toBe('FORBIDDEN')
      expect((await galatDari(ubahPenduduk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' }))).kode).toBe('FORBIDDEN')
      expect((await galatDari(cekNik(NIK_BARU))).kode).toBe('FORBIDDEN')
    }
  })
})

describe('PATCH /penduduk/:id (SPEC §6.4, penduduk-tulis.test.ts)', () => {
  it('perubahan tercatat di Riwayat dan Buku hari ini', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sebelum = await ambilPenduduk('pdk_siti_rahmah')
    const p = await ubahPenduduk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' })
    expect(p.pekerjaan).toBe('Wiraswasta')
    const [terbaru] = await ambilRiwayatPenduduk('pdk_siti_rahmah')
    expect(terbaru).toMatchObject({ jenis: 'ubah', field: 'pekerjaan', nilaiLama: sebelum.pekerjaan, nilaiBaru: 'Wiraswasta', oleh: { nama: 'Rosmiati' } })
    expect((await aktivitasTerbaru('penduduk-ubah')).ringkasan).toBe('Data penduduk diubah · Siti Rahmah (Pekerjaan)')
  })

  it('NIK sendiri bukan NIK ganda; NIK orang lain ditolak (fokus review 4)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const p = await ubahPenduduk('pdk_siti_rahmah', { nik: '1405095203918002', pekerjaan: 'Pedagang' })
    expect(p.pekerjaan).toBe('Pedagang')
    const syahrial = await ambilPenduduk('pdk_syahrial')
    expect((await galatDari(ubahPenduduk('pdk_siti_rahmah', { nik: syahrial.nik }))).kode).toBe('CONFLICT')
  })

  it('tanpa perubahan nyata → tidak ada riwayat baru', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sebelum = (await ambilRiwayatPenduduk('pdk_siti_rahmah')).length
    await ubahPenduduk('pdk_siti_rahmah', { nama: 'Siti Rahmah' })
    expect((await ambilRiwayatPenduduk('pdk_siti_rahmah')).length).toBe(sebelum)
  })

  it('kepala keluarga tidak bisa diubah lewat PATCH', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(ubahPenduduk('pdk_syahrial', { hubunganKeluarga: 'Suami' }))
    expect(galat.fields.hubunganKeluarga).toMatch(/Ganti kepala keluarga/)
  })
})

describe('POST /penduduk/cek-nik (SPEC §6.4, penduduk-tulis.test.ts)', () => {
  it('terdaftar beserta pemiliknya, belum terdaftar, dan pengecualian diri sendiri', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect(await cekNik('1405095203918002')).toEqual({ terdaftar: true, penduduk: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' } })
    expect(await cekNik(NIK_BARU)).toEqual({ terdaftar: false, penduduk: null })
    expect(await cekNik('1405095203918002', 'pdk_siti_rahmah')).toEqual({ terdaftar: false, penduduk: null })
  })
})

const PECAH = { anggotaIds: ['pdk_siti_rahmah', 'pdk_muhammad_alif'], kepalaBaruId: 'pdk_siti_rahmah', dusunId: 'dsn_ss_1', rw: '002', rt: '004' }

describe('POST /keluarga/:id/ganti-kepala (SPEC §6.5, keluarga-tulis.test.ts)', () => {
  it('kepala baru di urutan pertama; hubungan keduanya berganti dan tercatat di Riwayat', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const detail = await gantiKepala('kk_syahrial', { kepalaBaruId: 'pdk_siti_rahmah', hubunganKepalaLama: 'Suami' })
    expect(detail.keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(detail.anggota[0]).toMatchObject({ id: 'pdk_siti_rahmah', hubunganKeluarga: 'Kepala Keluarga' })
    expect((await ambilPenduduk('pdk_syahrial')).hubunganKeluarga).toBe('Suami')
    const [terbaru] = await ambilRiwayatPenduduk('pdk_syahrial')
    expect(terbaru).toMatchObject({ field: 'hubunganKeluarga', nilaiLama: 'Kepala Keluarga', nilaiBaru: 'Suami' })
    expect(await aktivitasTerbaru('keluarga-ganti-kepala')).toMatchObject({ rujukan_jenis: 'keluarga', rujukan_id: 'kk_syahrial' })
  })

  it('kepala baru harus anggota KK ini', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(gantiKepala('kk_syahrial', { kepalaBaruId: 'pdk_tidak_ada', hubunganKepalaLama: 'Suami' }))
    expect(galat.fields.kepalaBaruId).toBe('Pilih salah satu anggota KK ini')
  })
})

describe('POST /keluarga/:id/pecah (SPEC §6.5, keluarga-tulis.test.ts)', () => {
  it('anggota yang keluar membentuk KK baru; KK lama tetap dengan kepalanya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const baru = await pecahKeluarga('kk_syahrial', PECAH)
    expect(baru.keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(baru.anggota.map((a) => a.id)).toEqual(['pdk_siti_rahmah', 'pdk_muhammad_alif'])
    expect(baru.anggota[0].hubunganKeluarga).toBe('Kepala Keluarga')
    expect(baru.anggota[1].hubunganKeluarga).toBe('Anak')
    expect(baru.anggota.every((a) => a.keluargaId === baru.keluarga.id)).toBe(true)
    expect((await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.id)).toEqual(['pdk_syahrial', 'pdk_nur_aini'])
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
  })

  it('kepala keluarga tidak ikut dipecah', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(pecahKeluarga('kk_syahrial', { ...PECAH, anggotaIds: ['pdk_syahrial', 'pdk_nur_aini'], kepalaBaruId: 'pdk_nur_aini' }))
    expect(galat.fields.anggotaIds).toMatch(/Ganti kepala keluarga lebih dulu/)
  })

  it('kepala baru harus salah satu yang keluar', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(pecahKeluarga('kk_syahrial', { ...PECAH, kepalaBaruId: 'pdk_nur_aini' }))
    expect(galat.fields.kepalaBaruId).toMatch(/salah satu anggota yang keluar/)
  })

  it('Kepala Desa dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      await masukSebagai(akun)
      expect((await galatDari(pecahKeluarga('kk_syahrial', PECAH))).kode).toBe('FORBIDDEN')
      expect((await galatDari(gantiKepala('kk_syahrial', { kepalaBaruId: 'pdk_siti_rahmah', hubunganKepalaLama: 'Suami' }))).kode).toBe('FORBIDDEN')
    }
  })
})

describe('KK tanpa anggota (fokus review 3, keluarga-tulis.test.ts)', () => {
  it('hilang dari daftar dan hitungan KK, tetapi detail dan nomor KK mantan anggotanya tetap terbaca', async () => {
    await masukSebagai(AKUN_UJI.operator)
    // Perbedaan sengaja: tiruan mengosongkan `anggotaIds`; server menurunkan anggota dari status penduduk (Hidup), jadi semua
    // anggota KK dipindahkan statusnya.
    await sql()`update penduduk set status_dasar = 'Pindah' where keluarga_id = 'kk_syahrial'`
    expect((await ambilRingkasanPenduduk()).kk).toBe(805)
    expect((await daftarKeluarga({ pageSize: 100 })).meta.total).toBe(805)
    expect((await ambilKeluarga('kk_syahrial')).anggota).toEqual([])
    const [siti] = (await cariPenduduk('1405095203918002', { status: 'Pindah' })).data
    expect(siti.nomorKk).toBe('1405092011238004')
  })
})

const ISTILAH = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
/** Dua dusun baru Tanjung Lamo. Nomornya sengaja salah; server menomori ulang menurut urutan. */
const SUSUNAN: UbahWilayah = {
  istilah: ISTILAH,
  dusun: [
    { id: 'baru-1', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani', rw: [{ nomor: '009', ketua: 'Rasyid', rt: [{ nomor: '009', ketua: 'Udin' }, { nomor: '009', ketua: 'Usman' }] }] },
    { id: 'baru-2', nama: 'Lamo', kepalaDusun: 'Bahar', rw: [{ nomor: '009', ketua: 'Kasim', rt: [{ nomor: '009', ketua: 'Jalil' }] }] },
  ],
}
/** "dsn_tl_1#1 001(001,002)": ID, nomor dusun, lalu RW beserta RT-nya. */
const ringkas = (w: WilayahDesa) => w.dusun.map((d) => `${d.id}#${d.nomor} ${d.rw.map((rw) => `${rw.nomor}(${rw.rt.map((rt) => rt.nomor).join(',')})`).join(' ')}`)
const jumlahDusunTl = async (): Promise<number> => Number((await sql()`select count(*)::int as n from dusun where desa_id = 'desa_tanjung_lamo'`)[0].n)

describe('PUT /pengaturan/wilayah: susunan desa tanpa penduduk (tahap 6C, pengaturan-wilayah.test.ts)', () => {
  it('Tanjung Lamo belum punya penduduk: susunan terbuka; dusun, RW, dan RT tersimpan bernomor urut dan ikut di sesi', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await ambilWilayah()).toEqual({ istilah: ISTILAH, dusun: [], susunanTerkunci: false })
    const hasil = await simpanWilayah(SUSUNAN)
    expect(ringkas(hasil)).toEqual(['dsn_tl_1#1 001(001,002)', 'dsn_tl_2#2 002(003)'])
    expect(hasil.dusun[0]).toMatchObject({ desaId: 'desa_tanjung_lamo', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani', posyandu: '' })
    expect(hasil.susunanTerkunci).toBe(false)
    expect((await ambilSesi()).dusun.map((d) => d.id)).toEqual(['dsn_tl_1', 'dsn_tl_2'])
  })

  it('dusun lama tetap ber-ID sama; yang dihapus hilang; dusun baru di depan menggeser nomor', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    const [, lamo] = formDariWilayah(await simpanWilayah(SUSUNAN)).dusun
    const hasil = await simpanWilayah({ istilah: ISTILAH, dusun: [{ ...SUSUNAN.dusun[0], id: 'baru-3', nama: 'Hilir' }, lamo] })
    expect(ringkas(hasil)).toEqual(['dsn_tl_3#1 001(001,002)', 'dsn_tl_2#2 002(003)'])
    expect(await jumlahDusunTl()).toBe(2)
  })

  it('dusun yang dipakai akun Kepala Dusun tidak bisa dihapus; jabatannya ikut nomor baru (fokus review 3)', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    const awal = formDariWilayah(await simpanWilayah(SUSUNAN))
    await sql()`insert into pengguna (id, desa_id, nama, jabatan, peran, dusun_id, email, aktif, kata_sandi_hash)
      values ('pgn_kadus_lamo', 'desa_tanjung_lamo', 'Bahar', 'Kepala Dusun II', 'kadus', 'dsn_tl_2', 'bahar@tanjunglamo.desa.id', true, 'x')`
    expect(await galatDari(simpanWilayah({ ...awal, dusun: [awal.dusun[0]] }))).toMatchObject({
      kode: 'CONFLICT',
      message: 'Dusun II Lamo masih dipakai akun Bahar. Ganti peran akun itu dulu di Pengaturan › Pengguna.',
    })
    expect(await jumlahDusunTl()).toBe(2)
    await simpanWilayah({ ...awal, dusun: [awal.dusun[1]] })
    expect((await sql()`select jabatan from pengguna where id = 'pgn_kadus_lamo'`)[0].jabatan).toBe('Kepala Dusun I')
  })

  it('ID dusun desa lain diperlakukan sebagai dusun baru; dusun Sungai Sialang tidak berubah (fokus review 1)', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    const sebelum = await sql()`select * from dusun where id = 'dsn_ss_1'`
    const hasil = await simpanWilayah({ istilah: ISTILAH, dusun: [{ ...SUSUNAN.dusun[1], id: 'dsn_ss_1', nama: 'Bajakan' }] })
    expect(hasil.dusun.map((d) => d.id)).toEqual(['dsn_tl_1'])
    expect(await sql()`select * from dusun where id = 'dsn_ss_1'`).toEqual(sebelum)
  })

  it('susunan kosong ditolak per isian; istilah baru tersimpan bersama susunan', async () => {
    await masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await galatDari(simpanWilayah({ istilah: ISTILAH, dusun: [] }))).toMatchObject({ kode: 'VALIDATION', fields: { dusun: 'Tambahkan minimal satu dusun' } })
    expect((await simpanWilayah({ ...SUSUNAN, istilah: { ...ISTILAH, dusun: 'Jorong' } })).istilah.dusun).toBe('Jorong')
  })

  it('desa yang sudah punya penduduk: susunan terkunci, perubahan susunan tetap CONFLICT (fokus review 2)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const w = await ambilWilayah()
    expect(w.susunanTerkunci).toBe(true)
    const tambah = formDariWilayah(w)
    tambah.dusun.push({ ...SUSUNAN.dusun[0] })
    expect((await galatDari(simpanWilayah(tambah))).kode).toBe('CONFLICT')
  })
})
