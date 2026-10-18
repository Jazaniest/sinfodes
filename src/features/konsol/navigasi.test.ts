import { expect, it } from 'vitest'
import { menuKonsol } from './navigasi'

it('menu Konsol: Pemantauan hanya untuk pemantau, Desa hanya untuk Tim Sinfodes (SPEC-V0.2 §5.1)', () => {
  expect(menuKonsol('tim').map((m) => m.label)).toEqual(['Ringkasan', 'Desa'])
  expect(menuKonsol('pemantau').map((m) => m.label)).toEqual(['Ringkasan', 'Pemantauan'])
})
