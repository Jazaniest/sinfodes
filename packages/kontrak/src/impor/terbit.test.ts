import { describe, expect, it } from 'vitest'
import { tanggalTerbitDariNomorKk } from './terbit'

const SEKARANG = new Date('2026-09-24T02:00:00Z')

describe('tanggalTerbitDariNomorKk (SPEC-V0.2 §6.8)', () => {
  it('membaca DDMMYY di digit 7-12', () => {
    expect(tanggalTerbitDariNomorKk('1405091506249971', SEKARANG)).toBe('2024-06-15')
  })
  it('tanggal mustahil jatuh ke hari ini menurut WIB', () => {
    expect(tanggalTerbitDariNomorKk('1405093102249971', SEKARANG)).toBe('2026-09-24')
    expect(tanggalTerbitDariNomorKk('1405090000009971', new Date('2026-12-31T17:30:00Z'))).toBe('2027-01-01')
  })
})
