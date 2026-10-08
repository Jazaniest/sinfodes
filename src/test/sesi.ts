import type { Peran, SesiAdmin } from '@/domain/pengguna/schema'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '@/mocks/data/desa-demo'

/** Sesi admin Desa Sungai Sialang untuk satu peran (akun demo SPEC §12.9). Khusus uji. */
export function contohSesi(peran: Peran = 'operator'): SesiAdmin {
  const pengguna = PENGGUNA_DEMO.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.peran === peran)
  const desa = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!pengguna || !desa) throw new Error(`Akun demo untuk peran ${peran} tidak ada`)
  return { jenis: 'admin', pengguna, desa, dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG) }
}
