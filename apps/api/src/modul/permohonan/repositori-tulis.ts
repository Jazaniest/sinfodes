import { and, eq, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { permohonan, permohonanSisip, riwayatSurat } from '../../basisdata/skema'

export type BarisPermohonanBaru = typeof permohonanSisip.$inferInsert
export type BarisRiwayatSuratBaru = typeof riwayatSurat.$inferInsert
/** Satu-satunya kolom yang boleh diubah peran desa (hak kolom migrasi 0012), selain yang ditulis 8F2b. */
export type KolomUbahPermohonan = Partial<
  Pick<BarisPermohonanBaru, 'isianSandi' | 'status' | 'tahap' | 'dikembalikan' | 'penolakan' | 'ditutupPada' | 'catatanInternal'>
>

/** Nama kendala kunci asing `permohonan.jenis_id` di migrasi 0012. */
export const KENDALA_JENIS = 'permohonan_jenis_id_fkey'

export async function sisipPermohonan(db: Db, b: BarisPermohonanBaru): Promise<void> {
  await db.insert(permohonanSisip).values(b)
}

export async function sisipRiwayatSurat(db: Db, b: BarisRiwayatSuratBaru): Promise<void> {
  await db.insert(riwayatSurat).values(b)
}

export async function ubahKolomPermohonan(db: Db, id: string, kolom: KolomUbahPermohonan): Promise<void> {
  if (Object.keys(kolom).length === 0) return
  await db.update(permohonan).set(kolom).where(eq(permohonan.id, id))
}

/**
 * Nomor urut permohonan berikutnya untuk desa dan tahun itu, di bawah kunci penasihat transaksi: dua permintaan serentak antre,
 * jadi nomornya berurutan tanpa ganda. Pola `nomorKkBaru`. Indeks unik `(desa_id, tahun, no_urut)` tetap menjadi sabuk kedua.
 * Wajib dipanggil di dalam transaksi permintaan (kunci dilepas saat transaksi selesai).
 */
export async function alokasiNoUrut(db: Db, desaId: string, tahun: number): Promise<number> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`permohonan-nourut:${desaId}:${tahun}`}, 0))`)
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${permohonan.noUrut}), 0)`.mapWith(Number) })
    .from(permohonan)
    .where(and(eq(permohonan.desaId, desaId), eq(permohonan.tahun, tahun)))
  return n + 1
}
