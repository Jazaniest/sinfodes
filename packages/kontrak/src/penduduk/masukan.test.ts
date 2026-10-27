import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '../uji/contoh'
import { biodataDari, masukanPendudukSchema, ubahPendudukSchema, type MasukanPenduduk } from './masukan'

function contohMasukan(ubah: Partial<MasukanPenduduk> = {}): MasukanPenduduk {
  return { ...biodataDari(contohPenduduk()), keluarga: { jenis: 'ada', id: 'kk_syahrial' }, ...ubah }
}

describe('masukan penduduk (SPEC §6.4)', () => {
  it('biodataDari hanya mengambil field biodata', () => {
    const bio = biodataDari(contohPenduduk())
    expect(bio.nama).toBe('Siti Rahmah')
    expect(Object.keys(bio)).not.toContain('keluargaId')
    expect(Object.keys(bio)).not.toContain('statusDasar')
  })
  it('KK yang sudah ada atau KK baru dengan wilayah lengkap', () => {
    expect(masukanPendudukSchema.safeParse(contohMasukan()).success).toBe(true)
    const baru = contohMasukan({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_1', rw: '002', rt: '004' } })
    expect(masukanPendudukSchema.safeParse(baru).success).toBe(true)
    const rwRusak = contohMasukan({ keluarga: { jenis: 'baru', dusunId: 'dsn_ss_1', rw: '2', rt: '004' } })
    expect(masukanPendudukSchema.safeParse(rwRusak).success).toBe(false)
  })
  it('NIK boleh kosong (bayi), tetapi bila diisi harus 16 angka', () => {
    expect(masukanPendudukSchema.safeParse(contohMasukan({ nik: null })).success).toBe(true)
    expect(masukanPendudukSchema.safeParse(contohMasukan({ nik: '14050952039180' })).success).toBe(false)
  })
  it('telepon diawali 08', () => {
    expect(masukanPendudukSchema.safeParse(contohMasukan({ telepon: '628127740223' })).success).toBe(false)
  })
  it('ubah: hanya field yang dikirim; KK tidak bisa diubah lewat sini', () => {
    expect(ubahPendudukSchema.parse({ pekerjaan: 'Wiraswasta' })).toEqual({ pekerjaan: 'Wiraswasta' })
    expect(ubahPendudukSchema.parse({ keluarga: { jenis: 'ada', id: 'kk_lain' } })).toEqual({})
  })
})
