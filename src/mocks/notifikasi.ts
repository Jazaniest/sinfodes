import type { Notifikasi } from '@/domain/notifikasi/schema'
import { boleh, type Kemampuan } from '@/domain/pengguna/hak-akses'
import type { DbDemo } from './tipe-db'
import { idBaru } from './tulis'

type Kiriman = Pick<Notifikasi, 'desaId' | 'jenis' | 'judul' | 'isi' | 'waktu' | 'rujukan'> & {
  /** Kemampuan penerima; null berarti semua pengguna desa. */
  untuk: Kemampuan | null
  /** Pelaku kejadian tidak menerima notifikasinya sendiri. */
  kecuali: string | null
}

/** Satu salinan untuk setiap pengguna aktif desa yang berhak (SPEC §5.5). Dipanggil di dalam `ubahDb`. */
export function kirimNotifikasi(db: DbDemo, k: Kiriman): void {
  for (const p of db.pengguna) {
    if (p.desaId !== k.desaId || !p.aktif || p.id === k.kecuali) continue
    if (k.untuk !== null && !boleh(p.peran, k.untuk)) continue
    db.notifikasi.push({
      id: idBaru(db, 'ntf'), desaId: k.desaId, penggunaId: p.id, jenis: k.jenis, judul: k.judul, isi: k.isi, waktu: k.waktu,
      dibaca: false, rujukan: k.rujukan,
    })
  }
}
