import { setupWorker } from 'msw/browser'
import { keAlamat } from '@/app/alamat'
import { KUNCI_DB, muatDb, muatUlangDb } from './db'
import { handlers } from './handlers'
import { bukaSaluranHub } from './hub/iframe'
import { buatKlienHub } from './hub/klien'
import { penyimpananIdb } from './penyimpanan'
import { tandaiDataTerpisah } from './status-penyimpanan'

/**
 * Dipanggil `main.tsx` saat VITE_DEMO=true: muat data demo dari hub di alamat induk (satu dunia untuk semua subdomain),
 * lalu nyalakan API tiruan. `saatBerubah` dipanggil setelah data dimuat ulang karena tab lain mengubahnya. Bila hub tidak
 * terjangkau, data disimpan per alamat (SPEC-V0.2 §4.6).
 */
export async function mulaiMock({ saatBerubah }: { saatBerubah: () => void }): Promise<void> {
  const saluran = await bukaSaluranHub(keAlamat({ jenis: 'induk' }, ''))
  if (saluran) {
    const klien = buatKlienHub(saluran)
    await muatDb(klien)
    klien.padaBerubah((kunci) => {
      if (kunci !== KUNCI_DB) return
      void muatUlangDb().then((dimuat) => {
        if (dimuat) saatBerubah()
      })
    })
  } else {
    tandaiDataTerpisah()
    await muatDb(penyimpananIdb)
  }
  await setupWorker(...handlers).start({ onUnhandledRequest: 'bypass', quiet: true })
}
