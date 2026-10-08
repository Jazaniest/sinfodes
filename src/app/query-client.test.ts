import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { bolehCobaLagi } from './query-client'

describe('bolehCobaLagi', () => {
  it('sekali untuk galat server atau jaringan', () => {
    expect(bolehCobaLagi(0, new GalatApi('SERVER', 'x', 503))).toBe(true)
    expect(bolehCobaLagi(0, new GalatApi('SERVER', 'x', 0))).toBe(true)
    expect(bolehCobaLagi(1, new GalatApi('SERVER', 'x', 503))).toBe(false)
  })
  it('tidak untuk galat karena isian atau hak akses', () => {
    expect(bolehCobaLagi(0, new GalatApi('VALIDATION', 'x', 422))).toBe(false)
    expect(bolehCobaLagi(0, new GalatApi('FORBIDDEN', 'x', 403))).toBe(false)
    expect(bolehCobaLagi(0, new Error('lain'))).toBe(false)
  })
})
