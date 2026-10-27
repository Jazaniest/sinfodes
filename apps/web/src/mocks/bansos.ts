import { tahanPenyaluran } from '@/domain/bansos/schema'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

/**
 * Penerima bansos atas nama orang yang meninggal atau pindah keluar ditandai "perlu ditinjau" (SPEC §6.6, §8), dan
 * tahap yang belum tersalur ditahan. Penanda yang sudah ada tidak ditimpa. Dipanggil di dalam `ubahDb`.
 */
export function tandaiPenerimaDitinjau(db: DbDemo, pendudukIds: readonly string[], alasan: string, sejak: string): void {
  const ids = new Set(pendudukIds)
  for (const p of db.penerimaBansos) {
    if (!ids.has(p.atasNama.pendudukId) || p.perluDitinjau !== null) continue
    p.perluDitinjau = { alasan, sejak }
    p.penyaluran = tahanPenyaluran(p.penyaluran)
  }
}
