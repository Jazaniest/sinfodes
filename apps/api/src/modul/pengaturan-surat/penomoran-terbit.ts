import type { NomorTerbit } from '@sinfodes/kontrak/surat/penomoran'
import type { Db } from '../../basisdata/klien'

/**
 * Titik sambung nomor surat yang sudah terbit (rencana 8F1 Ruling 10), bahan contoh pada halaman Penomoran. Tabel permohonan baru
 * ada di tahap 8F2, jadi sampai itu jawabannya selalu kosong dan urut berikutnya 1. 8F2 mengganti isi fungsi ini dan mengubah
 * `it.todo` contoh penomoran di uji konformansi menjadi uji sungguhan.
 */
export function nomorTerbit(db: Db, desaId: string): Promise<readonly NomorTerbit[]> {
  void db
  void desaId
  return Promise.resolve([])
}
