import type { Pelaku } from '@sinfodes/kontrak/mutasi/schema'
import type { KejadianSurat } from '@sinfodes/kontrak/surat/permohonan'
import { randomUUID } from 'node:crypto'
import type { Db } from '../../basisdata/klien'
import { sisipRiwayatSurat } from './repositori-tulis'

/** Satu baris riwayat permohonan. Dipanggil dalam transaksi permintaan yang sama dengan perubahan statusnya. */
export async function catatRiwayatSurat(
  db: Db,
  p: { id: string; desaId: string },
  kejadian: KejadianSurat,
  oleh: Pelaku,
  waktu: Date,
  catatan: string | null = null,
): Promise<void> {
  await sisipRiwayatSurat(db, { id: `rws_${randomUUID()}`, desaId: p.desaId, permohonanId: p.id, kejadian, waktu, oleh, catatan })
}
