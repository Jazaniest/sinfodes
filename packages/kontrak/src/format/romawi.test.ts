import { describe, expect, it } from 'vitest'
import { angkaRomawi } from './romawi'

describe('angkaRomawi', () => {
  it.each([
    [1, 'I'], [4, 'IV'], [9, 'IX'], [12, 'XII'], [40, 'XL'], [2026, 'MMXXVI'],
  ] as const)('%i → %s', (n, romawi) => expect(angkaRomawi(n)).toBe(romawi))
  it('menolak nol dan pecahan', () => {
    expect(() => angkaRomawi(0)).toThrow()
    expect(() => angkaRomawi(1.5)).toThrow()
  })
})
