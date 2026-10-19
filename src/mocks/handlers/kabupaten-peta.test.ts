import { describe, expect, it } from 'vitest'
import { ambilDanaDesaKabupaten, ambilPetaKabupaten } from '@/api/kabupaten'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('GET /kabupaten/peta (SPEC-V0.2 §8.3 butir 5)', () => {
  it('Admin Pelalawan: 32 titik tanpa desa yang tertinggal titiknya; angka Dana Desa sama dengan layar Dana Desa', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const p = await ambilPetaKabupaten()
    expect(p.kabupaten).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(p.desa).toHaveLength(32)
    expect(p.tanpaTitik).toBe(0)
    const dana = await ambilDanaDesaKabupaten()
    expect(p.medianRealisasi).toBe(dana.medianRealisasi)
    const perDesa = new Map(dana.kecamatan.flatMap((k) => k.desa).map((d) => [d.id, d]))
    for (const d of p.desa) {
      expect(d.apbdes, d.nama).toEqual(perDesa.get(d.id)?.apbdes)
      expect(d.tertinggal, d.nama).toBe(perDesa.get(d.id)?.tertinggal)
    }
    expect(p.desa.find((d) => d.nama === 'Sungai Sialang')).toMatchObject({ kecamatan: 'Teluk Meranti', titik: [102.76, 0.2475], status: 'Aktif' })
  })
  it('Admin Siak hanya 2 desa Siak', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    expect((await ambilPetaKabupaten()).desa.map((d) => d.nama).sort()).toEqual(['Sungai Limau Hilir', 'Tualang Permai'])
  })
})
