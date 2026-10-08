import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluarga } from '@/api/keluarga'
import { ambilPenduduk, ambilRingkasanPenduduk, ambilRiwayatPenduduk, cekNik, tambahPenduduk, ubahPenduduk } from '@/api/penduduk'
import { biodataDari, type MasukanPenduduk } from '@/domain/penduduk/masukan'
import { buatNik } from '@/domain/penduduk/nik'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohPenduduk } from '@/test/contoh'

pakaiApiTiruan({ dbSegarTiapUji: true })

const NIK_BARU = buatNik({ kodeWilayah: '140509', tanggalLahir: '2015-05-10', jenisKelamin: 'L', nomorUrut: 9876 })

function masukanBaru(ubah: Partial<MasukanPenduduk> = {}): MasukanPenduduk {
  return {
    ...biodataDari(contohPenduduk()),
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
    keluarga: { jenis: 'ada', id: 'kk_syahrial' },
    ...ubah,
  }
}

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('POST /penduduk (SPEC §6.4)', () => {
  it('tambah ke KK yang ada: alamat ikut KK, jiwa bertambah, tercatat di Buku hari ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const p = await tambahPenduduk(masukanBaru())
    expect(p).toMatchObject({ keluargaId: 'kk_syahrial', dusunId: 'dsn_ss_1', rw: '002', rt: '004', statusDasar: 'Hidup' })
    expect((await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.id)).toContain(p.id)
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2813)
    expect(ambilDb().aktivitas.at(-1)).toMatchObject({ jenis: 'penduduk-tambah', ringkasan: 'Penduduk ditambahkan · Fajar Ramadhan' })
  })
  it('KK baru: nomor KK = kode wilayah + tanggal terbit hari ini + nomor urut, penduduknya jadi kepala', async () => {
    masukSebagai(AKUN_UJI.operator)
    const p = await tambahPenduduk(
      masukanBaru({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' } }),
    )
    const { keluarga } = await ambilKeluarga(p.keluargaId)
    expect(keluarga.nomorKk).toMatch(/^140509240926[89]\d{3}$/)
    expect(keluarga.kepalaKeluargaId).toBe(p.id)
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
  })
  it('KK yang sudah punya kepala tidak bisa diberi kepala kedua', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(masukanBaru({ hubunganKeluarga: 'Kepala Keluarga' })))
    expect(galat.kode).toBe('VALIDATION')
    expect(galat.fields.hubunganKeluarga).toMatch(/sudah punya kepala keluarga/)
  })
  it('wilayah KK baru harus ada di desa', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(
      tambahPenduduk(masukanBaru({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_1', rw: '009', rt: '999' } })),
    )
    expect(galat.fields.dusunId).toBe('Wilayah tidak dikenal')
  })
  it('NIK ganda → CONFLICT dengan nama pemilik (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(masukanBaru({ nik: '1405095203918002' })))
    expect(galat.kode).toBe('CONFLICT')
    expect(galat.fields.nik).toBe('NIK sudah terdaftar atas nama Siti Rahmah')
  })
  it('NIK milik mantan penduduk juga dianggap ganda (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const almarhum = ambilDb().penduduk.find((p) => p.statusDasar === 'Meninggal' && p.nik !== null)
    if (!almarhum) throw new Error('Data seed harus punya mantan penduduk ber-NIK')
    expect((await galatDari(tambahPenduduk(masukanBaru({ nik: almarhum.nik })))).kode).toBe('CONFLICT')
  })
  it('isian tidak valid → VALIDATION dengan rincian per field', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(tambahPenduduk(masukanBaru({ nama: '' })))
    expect(galat.kode).toBe('VALIDATION')
    expect(galat.fields.nama).toBe('Nama lengkap wajib diisi')
  })
  it('Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(tambahPenduduk(masukanBaru()))).kode).toBe('FORBIDDEN')
      expect((await galatDari(ubahPenduduk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' }))).kode).toBe('FORBIDDEN')
      expect((await galatDari(cekNik(NIK_BARU))).kode).toBe('FORBIDDEN')
    }
  })
})

describe('PATCH /penduduk/:id (SPEC §6.4)', () => {
  it('perubahan tercatat di Riwayat dan Buku hari ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const p = await ubahPenduduk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' })
    expect(p.pekerjaan).toBe('Wiraswasta')
    const [terbaru] = await ambilRiwayatPenduduk('pdk_siti_rahmah')
    expect(terbaru).toMatchObject({
      jenis: 'ubah', field: 'pekerjaan', nilaiLama: 'Mengurus Rumah Tangga', nilaiBaru: 'Wiraswasta', oleh: { nama: 'Rosmiati' },
    })
    expect(ambilDb().aktivitas.at(-1)?.ringkasan).toBe('Data penduduk diubah · Siti Rahmah (Pekerjaan)')
  })
  it('NIK sendiri bukan NIK ganda; NIK orang lain ditolak (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const p = await ubahPenduduk('pdk_siti_rahmah', { nik: '1405095203918002', pekerjaan: 'Pedagang' })
    expect(p.pekerjaan).toBe('Pedagang')
    const syahrial = await ambilPenduduk('pdk_syahrial')
    expect((await galatDari(ubahPenduduk('pdk_siti_rahmah', { nik: syahrial.nik }))).kode).toBe('CONFLICT')
  })
  it('tanpa perubahan nyata → tidak ada riwayat baru', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sebelum = ambilDb().riwayat.length
    await ubahPenduduk('pdk_siti_rahmah', { nama: 'Siti Rahmah' })
    expect(ambilDb().riwayat.length).toBe(sebelum)
  })
  it('kepala keluarga tidak bisa diubah lewat PATCH', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(ubahPenduduk('pdk_syahrial', { hubunganKeluarga: 'Suami' }))
    expect(galat.fields.hubunganKeluarga).toMatch(/Ganti kepala keluarga/)
  })
})

describe('POST /penduduk/cek-nik (SPEC §6.4)', () => {
  it('terdaftar beserta pemiliknya, belum terdaftar, dan pengecualian diri sendiri', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await cekNik('1405095203918002')).toEqual({ terdaftar: true, penduduk: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' } })
    expect(await cekNik(NIK_BARU)).toEqual({ terdaftar: false, penduduk: null })
    expect(await cekNik('1405095203918002', 'pdk_siti_rahmah')).toEqual({ terdaftar: false, penduduk: null })
  })
})
