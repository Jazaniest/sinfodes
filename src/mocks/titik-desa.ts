import type { Titik } from '@/domain/peta/titik'
import type { Desa } from '@/domain/wilayah/schema'
import { PUSAT_KECAMATAN } from './data/pusat-kecamatan'
import type { DbDemo } from './tipe-db'

/** Hash FNV-1a 32-bit: geseran titik yang sama untuk desa yang sama, tanpa PRNG supaya data lain tidak bergeser. */
function fnv1a(teks: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < teks.length; i++) h = Math.imul(h ^ teks.charCodeAt(i), 0x01000193)
  return h >>> 0
}

const bulat4 = (n: number) => Math.round(n * 10_000) / 10_000

/**
 * Titik desa di peta kabupaten (SPEC-V0.2 §8.3 butir 5). Desa yang sudah menggambar Peta Desa memakai pusat petanya; desa lain
 * memakai titik perkiraan 0,02-0,07 derajat dari pusat kecamatannya. Null bila kecamatannya tidak ada di tabel pusat.
 */
export function titikDesa(db: DbDemo, desa: Desa): Titik | null {
  const peta = db.peta.find((p) => p.desaId === desa.id)
  if (peta) return peta.pusat
  const pusat = PUSAT_KECAMATAN[desa.kecamatan.kode.replaceAll('.', '')] as Titik | undefined
  if (!pusat) return null
  const h = fnv1a(desa.id)
  const sudut = ((h % 360) * Math.PI) / 180
  const jarak = 0.02 + (((h >>> 9) % 1000) / 1000) * 0.05
  return [bulat4(pusat[0] + jarak * Math.cos(sudut)), bulat4(pusat[1] + jarak * Math.sin(sudut))]
}
