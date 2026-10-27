import { expect, it } from 'vitest'
import { POLA_NOMOR16_TAMPIL, samarkanNomor16 } from './nomor16'

it('NIK dan nomor KK disamarkan: 4 angka depan dan belakang tetap, tengahnya titik (SPEC-V0.2 §5.3)', () => {
  expect(samarkanNomor16('1405095203918002')).toBe('1405••••••••8002')
  expect(POLA_NOMOR16_TAMPIL.test('1405095203918002')).toBe(true)
  expect(POLA_NOMOR16_TAMPIL.test('1405••••••••8002')).toBe(true)
  expect(POLA_NOMOR16_TAMPIL.test('1405')).toBe(false)
  expect(POLA_NOMOR16_TAMPIL.test('1405•••••••8002')).toBe(false)
})
