import { and, eq, max, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { keluarga, penduduk } from '../../basisdata/skema'

export type RekamPenduduk = typeof penduduk.$inferSelect
export type RekamKeluarga = typeof keluarga.$inferSelect

/**
 * Semua penduduk desa pada konteks (RLS membatasi desa); Kepala Dusun hanya dusunnya. Penyaringan dan pengurutan dilakukan
 * di aplikasi dengan fungsi kontrak yang sama dengan API tiruan, karena NIK dan nomor KK terenkripsi (SPEC-V0.3 §7.6).
 */
export const bacaPendudukDesa = (db: Db, dusunSaja: string | null): Promise<RekamPenduduk[]> =>
  db.select().from(penduduk).where(dusunSaja === null ? undefined : eq(penduduk.dusunId, dusunSaja))

/** KK yang berada di dusun cakupan (semua dusun bila `dusunSaja` null), termasuk yang anggotanya sudah tidak aktif. */
export const bacaKeluargaDesa = (db: Db, dusunSaja: string | null): Promise<RekamKeluarga[]> =>
  db.select().from(keluarga).where(dusunSaja === null ? undefined : eq(keluarga.dusunId, dusunSaja))

/** Angka kepala halaman Penduduk, dihitung di basis data tanpa membuka sandi. */
export async function hitungRingkasan(db: Db, dusunSaja: string | null): Promise<{ jiwa: number; kk: number; diperbarui: Date | null }> {
  const [a] = await db
    .select({ jiwa: sql<number>`count(*) filter (where ${penduduk.statusDasar} = 'Hidup')`.mapWith(Number), diperbarui: max(penduduk.diubahPada) })
    .from(penduduk)
    .where(dusunSaja === null ? undefined : eq(penduduk.dusunId, dusunSaja))
  const [b] = await db
    .select({ kk: sql<number>`count(distinct ${keluarga.id})`.mapWith(Number) })
    .from(keluarga)
    .innerJoin(penduduk, eq(penduduk.keluargaId, keluarga.id))
    .where(and(eq(penduduk.statusDasar, 'Hidup'), dusunSaja === null ? undefined : eq(keluarga.dusunId, dusunSaja)))
  return { jiwa: a.jiwa, kk: b.kk, diperbarui: a.diperbarui }
}
