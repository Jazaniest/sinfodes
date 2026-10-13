import type { PeranKonsol, SesiKonsol } from '@/domain/konsol/schema'
import { PENGGUNA_KONSOL_DEMO } from '@/mocks/data/desa-konsol'

/** Sesi Konsol demo untuk satu peran (SPEC §12.9). Khusus uji. */
export function contohSesiKonsol(peran: PeranKonsol = 'tim'): SesiKonsol {
  const pengguna = PENGGUNA_KONSOL_DEMO.find((p) => p.peran === peran)
  if (!pengguna) throw new Error(`Akun konsol ${peran} tidak ada`)
  return { jenis: 'konsol', pengguna: structuredClone(pengguna) }
}
