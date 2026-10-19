import { expect, it } from 'vitest'
import { menuKabupaten, menuKabupatenAktif } from './navigasi'

it('menu dasbor 7C-1: Indeks & Peringkat sesudah Ringkasan, Siaran sebelum Pengguna; Pengguna hanya untuk Admin (SPEC-V0.2 §8.1, §8.3)', () => {
  expect(menuKabupaten('admin').map((m) => [m.label, m.href])).toEqual([
    ['Ringkasan', '/kabupaten/admin'],
    ['Indeks & Peringkat', '/kabupaten/admin/indeks'],
    ['Pemantauan', '/kabupaten/admin/pemantauan'],
    ['Dana Desa', '/kabupaten/admin/dana-desa'],
    ['Peta', '/kabupaten/admin/peta'],
    ['Data gabungan', '/kabupaten/admin/data-gabungan'],
    ['Laporan', '/kabupaten/admin/laporan'],
    ['Siaran', '/kabupaten/admin/siaran'],
    ['Pengguna', '/kabupaten/admin/pengguna'],
  ])
  expect(menuKabupaten('peninjau').map((m) => m.label)).toEqual(['Ringkasan', 'Indeks & Peringkat', 'Pemantauan', 'Dana Desa', 'Peta', 'Data gabungan', 'Laporan', 'Siaran'])
})

it('Ringkasan aktif hanya di akar dasbor; menu lain juga di bawahnya', () => {
  expect(menuKabupatenAktif('/kabupaten/admin', '/kabupaten/admin/')).toBe(true)
  expect(menuKabupatenAktif('/kabupaten/admin', '/kabupaten/admin/pemantauan')).toBe(false)
  expect(menuKabupatenAktif('/kabupaten/admin/pemantauan', '/kabupaten/admin/pemantauan')).toBe(true)
  expect(menuKabupatenAktif('/kabupaten/admin/dana-desa', '/kabupaten/admin/dana-desa/tenggat/tgt_pll_dd2')).toBe(true)
})
