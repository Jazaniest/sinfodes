import { and, asc, desc, eq, exists, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { mutasi, mutasiPenduduk, penduduk } from '../../basisdata/skema'

export type RekamMutasi = typeof mutasi.$inferSelect
export type BarisMutasiBaru = typeof mutasi.$inferInsert

/** Bulan "YYYY-MM" menjadi rentang tanggal [awal, sebelum): awal bulan itu sampai awal bulan berikutnya. */
function rentangBulan(bulan: string): { awal: string; sebelum: string } {
  const [tahun, bln] = bulan.split('-').map(Number)
  const berikut = bln === 12 ? `${tahun + 1}-01` : `${tahun}-${String(bln + 1).padStart(2, '0')}`
  return { awal: `${bulan}-01`, sebelum: `${berikut}-01` }
}

/**
 * Mutasi yang menyentuh paling sedikit satu penduduk dusun itu (semua mutasi desa bila `dusunSaja` null). Subkueri dibangun
 * dengan penyusun kueri, bukan teks SQL: Drizzle menulis kolom tanpa nama tabel pada kueri satu tabel, dan kolom `id` luar
 * akan tertukar dengan kolom dalam.
 */
const cakupanDusunMutasi = (db: Db, dusunSaja: string | null): SQL | undefined =>
  dusunSaja === null
    ? undefined
    : exists(
        db
          .select({ ada: sql`1` })
          .from(mutasiPenduduk)
          .innerJoin(penduduk, eq(penduduk.id, mutasiPenduduk.pendudukId))
          .where(and(eq(mutasiPenduduk.mutasiId, mutasi.id), eq(penduduk.dusunId, dusunSaja))),
      )

export type SaringanMutasi = { jenis?: string; bulan?: string }

/**
 * Satu halaman Buku Mutasi, terbaru dulu: tanggal menurun, waktu pencatatan menurun, lalu ID naik sebagai pemutus seri (rencana
 * 8E2 Ruling 12). RLS membatasi desa; Kepala Dusun hanya melihat mutasi yang menyentuh dusunnya.
 */
export async function bacaMutasiHalaman(
  db: Db,
  saringan: SaringanMutasi,
  dusunSaja: string | null,
  halaman: { page: number; pageSize: number },
): Promise<{ baris: RekamMutasi[]; total: number }> {
  const rentang = saringan.bulan === undefined ? undefined : rentangBulan(saringan.bulan)
  const syarat = and(
    saringan.jenis === undefined ? undefined : eq(mutasi.jenis, saringan.jenis),
    rentang === undefined ? undefined : and(gte(mutasi.tanggal, rentang.awal), lt(mutasi.tanggal, rentang.sebelum)),
    cakupanDusunMutasi(db, dusunSaja),
  )
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(mutasi).where(syarat)
  const baris = await db
    .select()
    .from(mutasi)
    .where(syarat)
    .orderBy(desc(mutasi.tanggal), desc(mutasi.dicatatPada), asc(mutasi.id))
    .limit(halaman.pageSize)
    .offset((halaman.page - 1) * halaman.pageSize)
  return { baris, total: n }
}

/** Penduduk tiap mutasi, berurutan menurut `urutan`, dengan nama; `nama` kosong bila penduduk di luar cakupan dusun. */
export async function bacaPendudukMutasi(
  db: Db,
  mutasiIds: readonly string[],
  dusunSaja: string | null,
): Promise<Map<string, { id: string; nama: string | null }[]>> {
  const hasil = new Map<string, { id: string; nama: string | null }[]>()
  if (mutasiIds.length === 0) return hasil
  const baris = await db
    .select({
      mutasiId: mutasiPenduduk.mutasiId,
      id: mutasiPenduduk.pendudukId,
      nama: dusunSaja === null ? penduduk.nama : sql<string | null>`case when ${penduduk.dusunId} = ${dusunSaja} then ${penduduk.nama} else null end`,
    })
    .from(mutasiPenduduk)
    .innerJoin(penduduk, eq(penduduk.id, mutasiPenduduk.pendudukId))
    .where(inArray(mutasiPenduduk.mutasiId, [...mutasiIds]))
    .orderBy(asc(mutasiPenduduk.mutasiId), asc(mutasiPenduduk.urutan))
  for (const b of baris) hasil.set(b.mutasiId, [...(hasil.get(b.mutasiId) ?? []), { id: b.id, nama: b.nama }])
  return hasil
}

/** Jumlah mutasi per jenis pada satu bulan, dalam cakupan dusun. Jenis yang tak ada tidak muncul. */
export async function hitungMutasiPerJenis(db: Db, bulan: string, dusunSaja: string | null): Promise<Map<string, number>> {
  const { awal, sebelum } = rentangBulan(bulan)
  const baris = await db
    .select({ jenis: mutasi.jenis, n: sql<number>`count(*)`.mapWith(Number) })
    .from(mutasi)
    .where(and(gte(mutasi.tanggal, awal), lt(mutasi.tanggal, sebelum), cakupanDusunMutasi(db, dusunSaja)))
    .groupBy(mutasi.jenis)
  return new Map(baris.map((b) => [b.jenis, b.n]))
}

/** ID penduduk yang tercatat datang pada tahun itu ("YYYY"), untuk preset "Pendatang tahun ini". */
export async function idPendatangTahunIni(db: Db, tahun: string): Promise<Set<string>> {
  const baris = await db
    .selectDistinct({ id: mutasiPenduduk.pendudukId })
    .from(mutasiPenduduk)
    .innerJoin(mutasi, eq(mutasi.id, mutasiPenduduk.mutasiId))
    .where(and(eq(mutasi.jenis, 'datang'), gte(mutasi.tanggal, `${tahun}-01-01`), lt(mutasi.tanggal, `${Number(tahun) + 1}-01-01`)))
  return new Set(baris.map((b) => b.id))
}

/** Mutasi yang menyentuh satu penduduk, untuk tab Riwayat. */
export const bacaMutasiPenduduk = (db: Db, pendudukId: string): Promise<RekamMutasi[]> =>
  db
    .select({
      id: mutasi.id, desaId: mutasi.desaId, jenis: mutasi.jenis, tanggal: mutasi.tanggal, dicatatOlehId: mutasi.dicatatOlehId,
      dicatatOlehNama: mutasi.dicatatOlehNama, dicatatPada: mutasi.dicatatPada, rincian: mutasi.rincian,
    })
    .from(mutasi)
    .innerJoin(mutasiPenduduk, eq(mutasiPenduduk.mutasiId, mutasi.id))
    .where(eq(mutasiPenduduk.pendudukId, pendudukId))
    .orderBy(asc(mutasi.dicatatPada), asc(mutasi.id))

/** Satu mutasi menurut id beserta ID penduduknya berurutan; RLS membatasi desa. Tidak ada = undefined. */
export async function bacaMutasiSatu(db: Db, id: string): Promise<{ rekam: RekamMutasi; pendudukIds: string[] } | undefined> {
  const [rekam] = await db.select().from(mutasi).where(eq(mutasi.id, id)).limit(1)
  if (!rekam) return undefined
  const baris = await db.select({ id: mutasiPenduduk.pendudukId }).from(mutasiPenduduk).where(eq(mutasiPenduduk.mutasiId, id)).orderBy(asc(mutasiPenduduk.urutan))
  return { rekam, pendudukIds: baris.map((b) => b.id) }
}
