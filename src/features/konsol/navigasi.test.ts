import { expect, it } from 'vitest'
import { MENU_KONSOL } from './navigasi'

it('menu Konsol hanya untuk Tim Sinfodes: Pemantauan pindah ke dasbor kabupaten (SPEC-V0.2 §7, §8.3)', () => {
  expect(MENU_KONSOL.map((m) => m.label)).toEqual(['Ringkasan', 'Desa'])
})
