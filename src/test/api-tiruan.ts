import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
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

/** Operator Desa Tanjung Lamo, desa berstatus Persiapan (SPEC §12.2). */
export const AKUN_DESA_BARU_UJI = 'pgn_yusri'

/** Akun layanan warga demo (SPEC §12.9): ID penduduknya. */
export const AKUN_WARGA_UJI = { siti: 'pdk_siti_rahmah', zulkifli: 'pdk_zulkifli' } as const

/** Akun Konsol demo (SPEC §12.9). */
export const AKUN_KONSOL_UJI = { tim: 'kns_dina', pemantau: 'kns_pmd_pelalawan' } as const

type OpsiApiTiruan = {
  /** Muat ulang data seed sebelum setiap uji. Wajib untuk uji yang menulis data, supaya uji tidak saling memengaruhi. */
  dbSegarTiapUji?: boolean
}

/** Nyalakan API tiruan untuk satu file uji. Hanya `Date` yang dipalsukan; timer dan fetch tetap berjalan normal. */
export function pakaiApiTiruan({ dbSegarTiapUji = false }: OpsiApiTiruan = {}): void {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(SEKARANG_UJI)
    await muatDb(penyimpananMemori(), SEKARANG_UJI)
    serverUji.listen({ onUnhandledRequest: 'error' })
  })
  if (dbSegarTiapUji) {
    beforeEach(async () => {
      await muatDb(penyimpananMemori(), SEKARANG_UJI)
    })
  }
  afterEach(() => {
    serverUji.resetHandlers()
    serverUji.events.removeAllListeners()
    aturModeJaringan('instan')
    aturTokenSesi(null)
    aturTokenSesi(null, 'warga')
    aturTokenSesi(null, 'konsol')
  })
  afterAll(() => {
    serverUji.close()
    vi.useRealTimers()
  })
}

export function masukSebagai(penggunaId: string): void {
  aturTokenSesi(`demo.${penggunaId}`)
}

export function masukSebagaiWarga(pendudukId: string): void {
  aturTokenSesi(`warga.${pendudukId}`, 'warga')
}

export function masukKonsolSebagai(penggunaId: string): void {
  aturTokenSesi(`konsol.${penggunaId}`, 'konsol')
}
