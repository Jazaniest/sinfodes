import type { SesiKabupaten } from '@/domain/kabupaten/schema'
import { KABUPATEN_MITRA_DEMO, PENGGUNA_KABUPATEN_DEMO } from '@sinfodes/demo/data/kabupaten-demo'

/** Sesi kabupaten demo untuk satu akun (SPEC-V0.2 §13). Khusus uji. */
export function contohSesiKabupaten(id = 'kab_fajar'): SesiKabupaten {
  const pengguna = PENGGUNA_KABUPATEN_DEMO.find((p) => p.id === id)
  const kab = KABUPATEN_MITRA_DEMO.find((k) => k.kode === pengguna?.kabupatenKode)
  if (!pengguna || !kab) throw new Error(`Akun kabupaten ${id} tidak ada`)
  return { jenis: 'kabupaten', pengguna: structuredClone(pengguna), kabupaten: { kode: kab.kode, nama: kab.nama, label: kab.label } }
}
