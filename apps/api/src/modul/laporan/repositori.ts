import { and, asc, eq, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { laporanData } from '../../basisdata/skema'

export type RekamLaporan = typeof laporanData.$inferSelect
export type SaringanLaporan = { status?: string; jenis?: string; pendudukId?: string }

/** Semua laporan cakupan, terlama dulu (ID sebagai pemutus seri). RLS membatasi desa; Kepala Dusun hanya dusunnya. */
export const bacaLaporanDaftar = (db: Db, saringan: SaringanLaporan, dusunSaja: string | null): Promise<RekamLaporan[]> =>
  db
    .select()
    .from(laporanData)
    .where(
      and(
        saringan.status === undefined ? undefined : eq(laporanData.status, saringan.status),
        saringan.jenis === undefined ? undefined : sql`${laporanData.isi} ->> 'jenis' = ${saringan.jenis}`,
        // Saringan penduduk hanya berlaku untuk laporan perbaikan (laporan kelahiran menunjuk ibu, bukan data yang diperbaiki).
        saringan.pendudukId === undefined ? undefined : sql`${laporanData.isi} ->> 'jenis' = 'perbaikan' and ${laporanData.isi} ->> 'pendudukId' = ${saringan.pendudukId}`,
        dusunSaja === null ? undefined : eq(laporanData.dusunId, dusunSaja),
      ),
    )
    .orderBy(asc(laporanData.dibuatPada), asc(laporanData.id))

export async function bacaLaporanSatu(db: Db, id: string, dusunSaja: string | null): Promise<RekamLaporan | undefined> {
  const [b] = await db
    .select()
    .from(laporanData)
    .where(and(eq(laporanData.id, id), dusunSaja === null ? undefined : eq(laporanData.dusunId, dusunSaja)))
    .limit(1)
  return b
}

/**
 * Mengunci baris laporan sampai transaksi selesai, lalu mengembalikannya: status dibaca SESUDAH kunci didapat, jadi dua petugas
 * pada laporan yang sama berurutan dan yang kedua melihat laporan yang sudah ditangani (rencana 8E2 Ruling 7).
 */
export async function kunciLaporan(db: Db, id: string, dusunSaja: string | null): Promise<RekamLaporan | undefined> {
  const [b] = await db
    .select()
    .from(laporanData)
    .where(and(eq(laporanData.id, id), dusunSaja === null ? undefined : eq(laporanData.dusunId, dusunSaja)))
    .limit(1)
    .for('update')
  return b
}

/** Menyelesaikan laporan: hanya lima kolom penanganan yang boleh diubah desa (hak kolom migrasi 0008). */
export async function tandaiLaporan(
  db: Db,
  id: string,
  p: { status: 'diterapkan' | 'ditolak'; olehId: string; olehNama: string; pada: Date; alasan: string | null },
): Promise<RekamLaporan> {
  const [b] = await db
    .update(laporanData)
    .set({ status: p.status, ditanganiOlehId: p.olehId, ditanganiOlehNama: p.olehNama, ditanganiPada: p.pada, ditanganiAlasan: p.alasan })
    .where(eq(laporanData.id, id))
    .returning()
  return b
}
