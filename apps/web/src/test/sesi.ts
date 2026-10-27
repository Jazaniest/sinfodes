import type { Peran, SesiAdmin } from '@/domain/pengguna/schema'
import type { SesiWarga } from '@/domain/warga/sesi'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG, ID_TANJUNG_LAMO, PENGGUNA_DEMO } from '@/mocks/data/desa-demo'

/** Sesi admin Desa Sungai Sialang untuk satu peran (akun demo SPEC §12.9). Khusus uji. */
export function contohSesi(peran: Peran = 'operator'): SesiAdmin {
  const pengguna = PENGGUNA_DEMO.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.peran === peran)
  const desa = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!pengguna || !desa) throw new Error(`Akun demo untuk peran ${peran} tidak ada`)
  return { jenis: 'admin', pengguna, desa, dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG), tampilanPanel: { warnaAksen: '#1F4E79', favicon: null } }
}

/** Sesi Operator Desa Tanjung Lamo, desa berstatus Persiapan tanpa dusun (SPEC §12.2). Khusus uji. */
export function contohSesiDesaBaru(): SesiAdmin {
  const pengguna = PENGGUNA_DEMO.find((p) => p.desaId === ID_TANJUNG_LAMO && p.peran === 'operator')
  const desa = DESA_DEMO.find((d) => d.id === ID_TANJUNG_LAMO)
  if (!pengguna || !desa) throw new Error('Akun demo Tanjung Lamo tidak ada')
  return { jenis: 'admin', pengguna, desa, dusun: [] }
}

/** Sesi layanan warga Siti Rahmah (akun demo SPEC §12.9). Khusus uji. */
export function contohSesiWarga(): SesiWarga {
  const desa = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!desa) throw new Error('Desa demo tidak ada')
  return {
    jenis: 'warga',
    penduduk: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah', nik: '1405095203918002', keluargaId: 'kk_syahrial' },
    desa,
    whatsapp: '081277402231',
  }
}
