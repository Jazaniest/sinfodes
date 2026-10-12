import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { daftarPenggunaDesa, ubahPengguna, undangPengguna } from '@/api/pengaturan'
import { masuk } from '@/api/sesi'
import { KATA_SANDI_DEMO } from '@/mocks/data/desa-demo'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('Pengguna desa (SPEC §8)', () => {
  it('hanya Sekretaris Desa; urut aktif, lalu peran; Operator dan Kepala Desa ditolak (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await daftarPenggunaDesa()).map((p) => p.nama)).toEqual(['Rosmiati', 'Hendri Saputra', 'H. Muhammad Nasir', 'Nurhayati', 'Sukardi'])
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.kades]) {
      masukSebagai(akun)
      expect((await galatDari(daftarPenggunaDesa())).kode).toBe('FORBIDDEN')
    }
  })
  it('undang: akun baru aktif dengan jabatan bawaan dan langsung bisa masuk; surel ganda ditolak', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const baru = await undangPengguna({ nama: 'Amran', email: 'Amran@SungaiSialang.desa.id', peran: 'kadus', dusunId: 'dsn_ss_1' })
    expect(baru).toMatchObject({ nama: 'Amran', email: 'amran@sungaisialang.desa.id', jabatan: 'Kepala Dusun I', aktif: true, dusunId: 'dsn_ss_1' })
    expect((await masuk('amran@sungaisialang.desa.id', KATA_SANDI_DEMO)).sesi.pengguna.id).toBe(baru.id)
    expect(await galatDari(undangPengguna({ nama: 'Rosmiati Dua', email: 'rosmiati@sungaisialang.desa.id', peran: 'operator', dusunId: null }))).toMatchObject({
      kode: 'CONFLICT', fields: { email: 'Surel ini sudah dipakai Rosmiati.' },
    })
  })
  it('ganti peran memperbarui jabatan; akun yang dinonaktifkan tidak bisa masuk lagi', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect(await ubahPengguna('pgn_rosmiati', { peran: 'kadus', dusunId: 'dsn_ss_3' })).toMatchObject({
      peran: 'kadus', dusunId: 'dsn_ss_3', jabatan: 'Kepala Dusun III',
    })
    expect(await ubahPengguna('pgn_nurhayati', { aktif: false })).toMatchObject({ aktif: false, jabatan: 'Kaur Keuangan' })
    expect((await galatDari(masuk('nurhayati@sungaisialang.desa.id', KATA_SANDI_DEMO))).kode).toBe('VALIDATION')
  })
  it('aturan: akun sendiri, Kepala Desa kedua, Kepala Dusun tanpa dusun, dan akun desa lain (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await galatDari(ubahPengguna('pgn_hendri', { aktif: false }))).kode).toBe('FORBIDDEN')
    expect(await galatDari(ubahPengguna('pgn_rosmiati', { peran: 'kades' }))).toMatchObject({
      kode: 'CONFLICT', fields: { peran: 'Sudah ada Kepala Desa aktif: H. Muhammad Nasir. Ganti perannya atau nonaktifkan dulu.' },
    })
    expect(await galatDari(undangPengguna({ nama: 'Ramli', email: 'ramli@sungaisialang.desa.id', peran: 'kadus', dusunId: null }))).toMatchObject({
      kode: 'VALIDATION', fields: { dusunId: 'Pilih dusun untuk Kepala Dusun' },
    })
    expect((await galatDari(ubahPengguna('pgn_yusri', { aktif: false }))).kode).toBe('NOT_FOUND')
  })
})
