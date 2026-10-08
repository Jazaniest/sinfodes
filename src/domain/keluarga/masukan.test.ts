import { describe, expect, it } from 'vitest'
import { gantiKepalaSchema, pecahKeluargaSchema, usulanHubunganKepalaLama, usulanHubunganPecah } from './masukan'

describe('masukan KK (SPEC §6.5)', () => {
  it('ganti kepala: hubungan kepala lama tidak boleh "Kepala Keluarga"', () => {
    expect(gantiKepalaSchema.safeParse({ kepalaBaruId: 'pdk_a', hubunganKepalaLama: 'Suami' }).success).toBe(true)
    expect(gantiKepalaSchema.safeParse({ kepalaBaruId: 'pdk_a', hubunganKepalaLama: 'Kepala Keluarga' }).success).toBe(false)
  })
  it('pecah: kepala baru harus salah satu anggota yang keluar', () => {
    const dasar = { anggotaIds: ['pdk_a', 'pdk_b'], dusunId: 'dsn_ss_1', rw: '002', rt: '004' }
    expect(pecahKeluargaSchema.parse({ ...dasar, kepalaBaruId: 'pdk_a' }).hubungan).toEqual({})
    const salah = pecahKeluargaSchema.safeParse({ ...dasar, kepalaBaruId: 'pdk_c' })
    expect(salah.success).toBe(false)
    expect(salah.error?.issues[0].path).toEqual(['kepalaBaruId'])
  })
  it('usulan hubungan di KK baru: menantu jadi suami/istri, cucu jadi anak', () => {
    expect(usulanHubunganPecah({ hubunganKeluarga: 'Menantu', jenisKelamin: 'P' })).toBe('Istri')
    expect(usulanHubunganPecah({ hubunganKeluarga: 'Menantu', jenisKelamin: 'L' })).toBe('Suami')
    expect(usulanHubunganPecah({ hubunganKeluarga: 'Cucu', jenisKelamin: 'L' })).toBe('Anak')
    expect(usulanHubunganPecah({ hubunganKeluarga: 'Anak', jenisKelamin: 'L' })).toBe('Anak')
  })
  it('usulan hubungan kepala lama mengikuti hubungan kepala baru', () => {
    expect(usulanHubunganKepalaLama('Istri')).toBe('Suami')
    expect(usulanHubunganKepalaLama('Suami')).toBe('Istri')
    expect(usulanHubunganKepalaLama('Anak')).toBe('Orang Tua')
    expect(usulanHubunganKepalaLama('Famili Lain')).toBe('Famili Lain')
  })
})
