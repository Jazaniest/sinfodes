import { expect, it } from 'vitest'
import { MENU_KONSOL, menuKonsolAktif } from './navigasi'

it('Tagihan aktif di halaman di bawahnya, termasuk detail tagihan', () => {
  expect(menuKonsolAktif('/konsol/tagihan', '/konsol/tagihan')).toBe(true)
  expect(menuKonsolAktif('/konsol/tagihan', '/konsol/tagihan/tgh_x')).toBe(true)
  expect(menuKonsolAktif('/konsol/desa', '/konsol/tagihan')).toBe(false)
})

it('menu Konsol hanya untuk Tim Sinfodes: Pemantauan pindah ke dasbor kabupaten (SPEC-V0.2 §7, §8.3)', () => {
  expect(MENU_KONSOL.map((m) => [m.label, m.href])).toEqual([
    ['Ringkasan', '/konsol'],
    ['Desa', '/konsol/desa'],
    ['Kabupaten', '/konsol/kabupaten'],
    ['Tagihan', '/konsol/tagihan'],
  ])
})
