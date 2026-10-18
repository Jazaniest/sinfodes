import { expect, it } from 'vitest'
import { menuKabupaten, menuKabupatenAktif } from './navigasi'

it('menu dasbor 7B-1: Pengguna hanya untuk Admin (SPEC-V0.2 §8.1, §8.3)', () => {
  expect(menuKabupaten('admin').map((m) => [m.label, m.href])).toEqual([
    ['Ringkasan', '/kabupaten/admin'],
    ['Pemantauan', '/kabupaten/admin/pemantauan'],
    ['Pengguna', '/kabupaten/admin/pengguna'],
  ])
  expect(menuKabupaten('peninjau').map((m) => m.label)).toEqual(['Ringkasan', 'Pemantauan'])
})

it('Ringkasan aktif hanya di akar dasbor; menu lain juga di bawahnya', () => {
  expect(menuKabupatenAktif('/kabupaten/admin', '/kabupaten/admin/')).toBe(true)
  expect(menuKabupatenAktif('/kabupaten/admin', '/kabupaten/admin/pemantauan')).toBe(false)
  expect(menuKabupatenAktif('/kabupaten/admin/pemantauan', '/kabupaten/admin/pemantauan')).toBe(true)
})
