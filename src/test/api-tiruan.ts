import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { muatDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { serverUji } from '@/mocks/node'
import { penyimpananMemori } from '@/mocks/penyimpanan'

/** Kamis, 24 September 2026 pukul 09.00 WIB: "sekarang" di semua uji yang memakai API tiruan. */
export const SEKARANG_UJI = new Date('2026-09-24T02:00:00Z')

export const AKUN_UJI = {
  operator: 'pgn_rosmiati',
  sekdes: 'pgn_hendri',
  kades: 'pgn_nasir',
  kaurKeuangan: 'pgn_nurhayati',
  kadus: 'pgn_sukardi',
} as const

/** Nyalakan API tiruan untuk satu file uji. Hanya `Date` yang dipalsukan; timer dan fetch tetap berjalan normal. */
export function pakaiApiTiruan(): void {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(SEKARANG_UJI)
    await muatDb(penyimpananMemori(), SEKARANG_UJI)
    serverUji.listen({ onUnhandledRequest: 'error' })
  })
  afterEach(() => {
    serverUji.resetHandlers()
    serverUji.events.removeAllListeners()
    aturModeJaringan('instan')
    aturTokenSesi(null)
  })
  afterAll(() => {
    serverUji.close()
    vi.useRealTimers()
  })
}

export function masukSebagai(penggunaId: string): void {
  aturTokenSesi(`demo.${penggunaId}`)
}
