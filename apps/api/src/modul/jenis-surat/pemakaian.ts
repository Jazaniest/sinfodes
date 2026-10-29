import type { Db } from '../../basisdata/klien'

/** `jumlah`: permohonan 12 bulan terakhir per jenis. `dipakai`: jenis yang pernah dipakai permohonan mana pun, kapan pun. */
export type Pemakaian = { jumlah: ReadonlyMap<string, number>; dipakai: ReadonlySet<string> }

/**
 * Titik sambung pemakaian jenis surat oleh permohonan (rencana 8F1 Ruling 7). Tabel permohonan baru ada di tahap 8F2, jadi sampai
 * itu jawabannya selalu kosong: belum ada jenis yang dipakai. 8F2 mengganti isi fungsi ini dan memasang kunci asing
 * `ON DELETE RESTRICT`, lalu mengubah `it.todo` penghapusan jenis terpakai menjadi uji sungguhan.
 */
export function pemakaianJenis(db: Db, desaId: string): Promise<Pemakaian> {
  void db
  void desaId
  return Promise.resolve({ jumlah: new Map(), dipakai: new Set() })
}
