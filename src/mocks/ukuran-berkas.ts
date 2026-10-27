import type { DbDemo } from './tipe-db'

/** Ukuran gambar data URL dalam byte: panjang base64 × 3/4. */
const byteDataUrl = (teks: string): number => {
  const koma = teks.indexOf(',')
  return koma < 0 ? 0 : Math.floor(((teks.length - koma - 1) * 3) / 4)
}

/** Jumlah byte berkas di satu nilai: angka `ukuranKb` dan string `data:`, bersarang. */
function byteDi(nilai: unknown): number {
  if (typeof nilai === 'string') return nilai.startsWith('data:') ? byteDataUrl(nilai) : 0
  if (Array.isArray(nilai)) return nilai.reduce((n: number, x) => n + byteDi(x), 0)
  if (nilai && typeof nilai === 'object') {
    return Object.entries(nilai).reduce(
      (n: number, [k, v]) => n + (k === 'ukuranKb' && typeof v === 'number' ? v * 1024 : byteDi(v)),
      0,
    )
  }
  return 0
}

/**
 * Pemakaian penyimpanan berkas satu desa dalam KB (SPEC-V0.2 §5.1): rekaman ber-`desaId` desa itu, ditambah rekaman desanya
 * sendiri (lambang). Hanya ukurannya yang dihitung; isinya tidak pernah dibaca Konsol.
 */
export function ukuranBerkasDesa(db: DbDemo, desaId: string): number {
  let byte = 0
  for (const [kunci, isi] of Object.entries(db)) {
    if (!Array.isArray(isi)) continue
    for (const rekaman of isi as unknown[]) {
      if (!rekaman || typeof rekaman !== 'object') continue
      const r = rekaman as { desaId?: unknown; id?: unknown }
      if (r.desaId === desaId || (kunci === 'desa' && r.id === desaId)) byte += byteDi(rekaman)
    }
  }
  return Math.round(byte / 1024)
}
