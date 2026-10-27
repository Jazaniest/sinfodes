import { describe, expect, it } from 'vitest'
import { samarkanTelepon } from './telepon'

describe('samarkanTelepon (SPEC §7.4)', () => {
  it('empat angka depan dan belakang saja', () => expect(samarkanTelepon('081277402231')).toBe('0812-••••-2231'))
  it('pemisah di masukan diabaikan', () => expect(samarkanTelepon('0812-7740-2231')).toBe('0812-••••-2231'))
})
