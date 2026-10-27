import type { SesiKonsol } from '@/domain/konsol/schema'
import { PENGGUNA_KONSOL_DEMO } from '@sinfodes/demo/data/desa-konsol'

/** Sesi Konsol demo Tim Sinfodes (SPEC §12.9). Khusus uji. */
export function contohSesiKonsol(): SesiKonsol {
  const pengguna = PENGGUNA_KONSOL_DEMO[0]
  if (!pengguna) throw new Error('Akun konsol tidak ada')
  return { jenis: 'konsol', pengguna: structuredClone(pengguna) }
}
