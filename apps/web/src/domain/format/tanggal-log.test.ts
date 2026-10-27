import { describe, expect, it } from 'vitest'
import { formatWaktuLog } from './tanggal'

describe('formatWaktuLog (SPEC §4.5)', () => {
  it('tanggal pendek dan jam WIB', () => expect(formatWaktuLog('2026-09-24T09:12:00+07:00')).toBe('24 Sep 2026 · pukul 09.12 WIB'))
  it('waktu UTC diubah ke WIB', () => expect(formatWaktuLog('2026-09-23T20:05:00Z')).toBe('24 Sep 2026 · pukul 03.05 WIB'))
})
