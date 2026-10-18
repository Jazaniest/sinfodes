import { describe, expect, it } from 'vitest'
import { ambilRingkasanInduk, cariDesa } from '@/api/induk'
import { ambilDb, ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const SUNGAI_SIALANG = { label: 'sungaisialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan' }

describe('API halaman utama Sinfodes (SPEC-V0.2 §4.4)', () => {
  it('Cari desa: bagian nama, tanpa peduli huruf besar-kecil, tanpa sesi', async () => {
    expect((await cariDesa('sial')).hasil).toContainEqual(SUNGAI_SIALANG)
    expect((await cariDesa('  SUNGAI SIAL ')).hasil).toContainEqual(SUNGAI_SIALANG)
  })
  it('Cari desa: desa Persiapan tidak muncul, kata kurang dari 3 huruf tidak dicari', async () => {
    expect((await cariDesa('tanjung lamo')).hasil).toEqual([])
    expect((await cariDesa('ab')).hasil).toEqual([])
  })
  it('Cari desa: desa Ditangguhkan tetap ditemukan, karena websitenya tetap tayang (SPEC-V0.2 §4.1)', async () => {
    const desa = ambilDb().desa.find((d) => d.status === 'Ditangguhkan')
    expect(desa).toBeDefined()
    const { hasil } = await cariDesa(desa?.nama.slice(0, 5) ?? '')
    expect(hasil.map((h) => h.label)).toContain(desa?.slug)
  })
  it('Cari desa: urut nama, paling banyak 10', async () => {
    ubahDb((d) => {
      const contoh = d.desa.find((x) => x.status === 'Aktif')
      if (!contoh) throw new Error('tidak ada desa Aktif')
      // Urutan masuk dibalik supaya urutan hasil benar-benar dibentuk server.
      for (let i = 12; i >= 1; i--) d.desa.push({ ...contoh, id: `desa_uji_${i}`, slug: `kampunguji${i}`, nama: `Kampung Uji ${String(i).padStart(2, '0')}` })
    })
    const { hasil } = await cariDesa('kampung uji')
    expect(hasil.map((h) => h.nama)).toEqual(Array.from({ length: 10 }, (_, i) => `Kampung Uji ${String(i + 1).padStart(2, '0')}`))
  })
  it('ringkasan: desa bergabung = Aktif + Uji coba', async () => {
    expect((await ambilRingkasanInduk()).desaBergabung).toBe(31)
  })
})
