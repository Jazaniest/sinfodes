import { setupWorker } from 'msw/browser'
import { muatDb } from './db'
import { handlers } from './handlers'
import { penyimpananIdb } from './penyimpanan'

/** Dipanggil `main.tsx` saat VITE_DEMO=true: muat data demo, lalu nyalakan API tiruan. */
export async function mulaiMock(): Promise<void> {
  await muatDb(penyimpananIdb)
  await setupWorker(...handlers).start({ onUnhandledRequest: 'bypass', quiet: true })
}
