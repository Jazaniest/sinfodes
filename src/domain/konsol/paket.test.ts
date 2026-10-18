import { expect, it } from 'vitest'
import { HARGA_TRIWULAN } from './filter'
import { RINCIAN_PAKET } from './paket'

it('rincian paket (SPEC-V0.2 §18): semua modul di kedua paket, harga tahunan = 4 triwulan', () => {
  expect(RINCIAN_PAKET.Dasar).toEqual({
    modul: 'Semua modul', akun: '5', penyimpanan: '2 GB', bantuan: 'WhatsApp, jam kerja', pelatihan: 'Panduan tertulis',
    impor: 'Dikerjakan desa', hargaTahunan: 6_000_000, hargaTriwulan: HARGA_TRIWULAN.Dasar,
  })
  expect(RINCIAN_PAKET.Lengkap).toEqual({
    modul: 'Semua modul', akun: 'Tanpa batas', penyimpanan: '10 GB', bantuan: 'Prioritas', pelatihan: 'Pelatihan daring',
    impor: 'Dibantu tim Sinfodes', hargaTahunan: 12_000_000, hargaTriwulan: HARGA_TRIWULAN.Lengkap,
  })
})
