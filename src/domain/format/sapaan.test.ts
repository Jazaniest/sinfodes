import { describe, expect, it } from 'vitest'
import { sapaanWaktu } from './sapaan'

describe('sapaanWaktu (jam WIB)', () => {
  it.each([
    ['2026-09-24T02:00:00Z', 'Selamat pagi'],
    ['2026-09-24T05:30:00Z', 'Selamat siang'],
    ['2026-09-24T09:00:00Z', 'Selamat sore'],
    ['2026-09-24T13:00:00Z', 'Selamat malam'],
  ])('%s → %s', (iso, sapaan) => expect(sapaanWaktu(new Date(iso))).toBe(sapaan))
})
