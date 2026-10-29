import { STATUS_TERBUKA, type StatusPermohonan } from '@sinfodes/kontrak/surat/permohonan'
import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { jenisSurat, penduduk, permohonan, riwayatSurat } from '../../basisdata/skema'

export type RekamPermohonan = typeof permohonan.$inferSelect
export type RekamRiwayatSurat = typeof riwayatSurat.$inferSelect

/** Baris daftar: kolom permohonan yang tampil ditambah jenis dan pemohon, tanpa membuka satu pun sandi. */
export type RekamBaris = {
  id: string
  desaId: string
  noUrut: number
  status: string
  tahap: string | null
  dikembalikan: boolean
  kanal: string
  masukPada: Date
  ditutupPada: Date | null
  nomor: string | null
  jenisId: string
  jenisKode: string
  jenisNama: string
  pemohonId: string
  pemohonNama: string
  pemohonNikSandi: string | null
}

/** Satu permohonan menurut id. RLS membatasi desa; Kepala Dusun hanya dusunnya. `kunci` mengunci barisnya (FOR UPDATE). Tidak ada = undefined. */
export async function bacaPermohonanSatu(db: Db, id: string, dusunSaja: string | null, opsi: { kunci?: boolean } = {}): Promise<RekamPermohonan | undefined> {
  const kueri = db
    .select()
    .from(permohonan)
    .where(and(eq(permohonan.id, id), dusunSaja === null ? undefined : eq(permohonan.dusunId, dusunSaja)))
  const [b] = await (opsi.kunci ? kueri.for('update') : kueri)
  return b
}

/** Riwayat satu permohonan menurut urutan kejadian. */
export const bacaRiwayatPermohonan = (db: Db, permohonanId: string): Promise<RekamRiwayatSurat[]> =>
  db.select().from(riwayatSurat).where(eq(riwayatSurat.permohonanId, permohonanId)).orderBy(asc(riwayatSurat.urutan))

const kolomBaris = {
  id: permohonan.id,
  desaId: permohonan.desaId,
  noUrut: permohonan.noUrut,
  status: permohonan.status,
  tahap: permohonan.tahap,
  dikembalikan: sql<boolean>`(${permohonan.dikembalikan} is not null)`,
  kanal: permohonan.kanal,
  masukPada: permohonan.masukPada,
  ditutupPada: permohonan.ditutupPada,
  nomor: permohonan.terbitNomor,
  jenisId: permohonan.jenisId,
  jenisKode: jenisSurat.kode,
  jenisNama: jenisSurat.nama,
  pemohonId: permohonan.pemohonId,
  pemohonNama: penduduk.nama,
  pemohonNikSandi: penduduk.nikSandi,
}

export type SaringanDaftar = {
  dusunSaja: string | null
  /** Kode jenis (mis. SKD); kode yang tidak dikenal tidak cocok dengan baris mana pun. */
  jenisKode?: string | null
  /** Permohonan tertutup hanya yang masuk pada atau sesudah tanggal ini (YYYY-MM-DD, WIB); yang terbuka selalu ikut. */
  tutupSejak?: string
  status?: StatusPermohonan
}

/** Syarat WHERE daftar: cakupan dusun, jenis, status, dan periode (yang terbuka tidak pernah dibatasi periode). */
export function syaratDaftar(s: SaringanDaftar): SQL | undefined {
  return and(
    s.dusunSaja === null ? undefined : eq(permohonan.dusunId, s.dusunSaja),
    s.jenisKode == null ? undefined : eq(jenisSurat.kode, s.jenisKode),
    s.status === undefined ? undefined : eq(permohonan.status, s.status),
    s.tutupSejak === undefined
      ? undefined
      : or(inArray(permohonan.status, [...STATUS_TERBUKA]), sql`(${permohonan.masukPada} at time zone 'Asia/Jakarta')::date >= ${s.tutupSejak}::date`),
  )
}

/** Urutan daftar: yang terbuka terlama dulu, yang tertutup terbaru ditutup dulu; ID memutus seri supaya halaman tidak bergeser. */
export const urutanDaftar = (status: StatusPermohonan): SQL[] =>
  STATUS_TERBUKA.includes(status)
    ? [asc(permohonan.masukPada), asc(permohonan.id)]
    : [desc(sql`coalesce(${permohonan.ditutupPada}, ${permohonan.masukPada})`), asc(permohonan.id)]

/** Baris daftar menurut syarat dan urutan, dipotong bila `halaman` diberikan. */
export function bacaBaris(db: Db, syarat: SQL | undefined, urut: SQL[], halaman?: { batas: number; lewati: number }): Promise<RekamBaris[]> {
  let kueri = db
    .select(kolomBaris)
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .innerJoin(penduduk, eq(penduduk.id, permohonan.pemohonId))
    .where(syarat)
    .orderBy(...urut)
    .$dynamic()
  if (halaman) kueri = kueri.limit(halaman.batas).offset(halaman.lewati)
  return kueri
}

export async function hitungBaris(db: Db, syarat: SQL | undefined): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .where(syarat)
  return n
}

/** Jumlah permohonan per status menurut syarat (tab Permohonan). */
export async function hitungPerStatus(db: Db, syarat: SQL | undefined): Promise<Map<string, number>> {
  const baris = await db
    .select({ status: permohonan.status, n: sql<number>`count(*)`.mapWith(Number) })
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .where(syarat)
    .groupBy(permohonan.status)
  return new Map(baris.map((b) => [b.status, b.n]))
}

export type KelompokKeadaan = { status: string; tahap: string | null; dikembalikan: boolean; jumlah: number }

/**
 * Permohonan dalam cakupan dikelompokkan menurut tiga kolom yang menentukan "perlu tindakan": status, tahap, dan ada tidaknya
 * catatan pengembalian. Aturan menghitungnya tetap di kontrak (`perluTindakan`), jadi tidak ada salinan aturan di SQL.
 */
export async function bacaKelompokKeadaan(db: Db, dusunSaja: string | null): Promise<KelompokKeadaan[]> {
  const dikembalikan = sql<boolean>`(${permohonan.dikembalikan} is not null)`
  return db
    .select({ status: permohonan.status, tahap: permohonan.tahap, dikembalikan, jumlah: sql<number>`count(*)`.mapWith(Number) })
    .from(permohonan)
    .where(dusunSaja === null ? undefined : eq(permohonan.dusunId, dusunSaja))
    .groupBy(permohonan.status, permohonan.tahap, dikembalikan)
}

/** Permohonan yang menunggu tanda tangan (tahap tanda-tangan), terlama dulu. Penyaringan menurut peran dan jenis dilakukan pemanggil. */
export const bacaMenungguTandaTangan = (db: Db, dusunSaja: string | null): Promise<RekamPermohonan[]> =>
  db
    .select()
    .from(permohonan)
    .where(and(eq(permohonan.status, 'perlu-ttd'), eq(permohonan.tahap, 'tanda-tangan'), dusunSaja === null ? undefined : eq(permohonan.dusunId, dusunSaja)))
    .orderBy(asc(permohonan.masukPada), asc(permohonan.id))

/** Syarat WHERE permohonan satu penduduk, sebagai pemohon atau sebagai yang diterangkan. */
export const syaratPerPenduduk = (pendudukId: string, dusunSaja: string | null): SQL | undefined =>
  and(or(eq(permohonan.pemohonId, pendudukId), eq(permohonan.subjekId, pendudukId)), dusunSaja === null ? undefined : eq(permohonan.dusunId, dusunSaja))

/** Terbaru masuk dulu; ID memutus seri. */
export const urutanPerPenduduk = (): SQL[] => [desc(permohonan.masukPada), asc(permohonan.id)]

/** Jumlah permohonan per jenis yang masuk pada atau sesudah `sejak` (YYYY-MM-DD WIB), dan seluruh jenis yang pernah dipakai kapan pun. */
export async function bacaPemakaianJenis(db: Db, desaId: string, sejak: string): Promise<{ jumlah: Map<string, number>; dipakai: Set<string> }> {
  const baris = await db
    .select({
      jenisId: permohonan.jenisId,
      jumlah: sql<number>`count(*) filter (where (${permohonan.masukPada} at time zone 'Asia/Jakarta')::date >= ${sejak}::date)`.mapWith(Number),
    })
    .from(permohonan)
    .where(eq(permohonan.desaId, desaId))
    .groupBy(permohonan.jenisId)
  return {
    jumlah: new Map(baris.filter((b) => b.jumlah > 0).map((b) => [b.jenisId, b.jumlah])),
    dipakai: new Set(baris.map((b) => b.jenisId)),
  }
}

/** Nomor surat yang sudah terbit di desa itu: bahan contoh urut berikutnya pada halaman Penomoran. */
export async function bacaNomorTerbit(db: Db, desaId: string): Promise<{ jenisId: string; tahun: number; urut: number }[]> {
  const baris = await db
    .select({ jenisId: permohonan.jenisId, tahun: permohonan.terbitTahun, urut: permohonan.terbitUrut })
    .from(permohonan)
    .where(and(eq(permohonan.desaId, desaId), sql`${permohonan.terbitUrut} is not null`))
  return baris.flatMap((b) => (b.tahun === null || b.urut === null ? [] : [{ jenisId: b.jenisId, tahun: b.tahun, urut: b.urut }]))
}

/** Satu permohonan dalam ringkasan paling kecil untuk pencarian: orang yang terkait dan nomor suratnya. */
export type PasanganPermohonan = { id: string; pemohonId: string; pemohonNama: string; subjekId: string | null; nomor: string | null }

/**
 * Permohonan dalam syarat, terbaru masuk dulu (ID memutus seri), dengan hanya kolom yang dibutuhkan untuk mencocokkan kata cari.
 * Pencocokan nama dan NIK dilakukan di aplikasi karena NIK tersandi (SPEC-V0.3 §7.6).
 */
export const bacaPasangan = (db: Db, syarat: SQL | undefined): Promise<PasanganPermohonan[]> =>
  db
    .select({ id: permohonan.id, pemohonId: permohonan.pemohonId, pemohonNama: penduduk.nama, subjekId: permohonan.subjekId, nomor: permohonan.terbitNomor })
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .innerJoin(penduduk, eq(penduduk.id, permohonan.pemohonId))
    .where(syarat)
    .orderBy(desc(permohonan.masukPada), asc(permohonan.id))

/** Syarat WHERE untuk sekumpulan ID permohonan. Tidak boleh kosong. */
export const syaratIdPermohonan = (ids: readonly string[]): SQL | undefined => inArray(permohonan.id, [...ids])

const UKURAN_KELOMPOK_ID = 5000

/** Penduduk menurut ID (RLS membatasi desa), dikerjakan per kelompok supaya jumlah parameter kueri tetap aman. */
export async function bacaPendudukIds(db: Db, ids: readonly string[]): Promise<(typeof penduduk.$inferSelect)[]> {
  const hasil: (typeof penduduk.$inferSelect)[] = []
  for (let i = 0; i < ids.length; i += UKURAN_KELOMPOK_ID) {
    hasil.push(...(await db.select().from(penduduk).where(inArray(penduduk.id, ids.slice(i, i + UKURAN_KELOMPOK_ID)))))
  }
  return hasil
}

/** Seluruh anggota satu KK, termasuk yang sudah tidak aktif. */
export const bacaAnggotaKeluarga = (db: Db, keluargaId: string): Promise<(typeof penduduk.$inferSelect)[]> =>
  db.select().from(penduduk).where(eq(penduduk.keluargaId, keluargaId))
