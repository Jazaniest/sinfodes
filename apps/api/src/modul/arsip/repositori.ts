import { and, asc, eq, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Db } from '../../basisdata/klien'
import { jenisSurat, penduduk, permohonan, suratMasuk } from '../../basisdata/skema'

export type RekamSuratMasuk = typeof suratMasuk.$inferSelect
export type BarisSuratMasukBaru = typeof suratMasuk.$inferInsert

/** Nama indeks unik nomor agenda per desa dan tahun (migrasi 0014). */
export const INDEKS_NO_AGENDA = 'surat_masuk_desa_id_tahun_no_agenda_key'

/** Satu surat keluar: permohonan yang sudah terbit, dengan jenis dan nama orang yang diterangkan, tanpa membuka sandi apa pun. */
export type RekamSuratKeluar = {
  id: string
  nomor: string | null
  urut: number | null
  terbitPada: Date | null
  status: string
  kanal: string
  penandatangan: unknown
  jenisKode: string
  jenisNama: string
  untukNama: string | null
}

export type SaringanKeluar = {
  dusunSaja: string | null
  /** Awal bulan (YYYY-MM-01). Bulan dibaca menurut WIB seluruhnya di SQL: [awal bulan WIB, awal bulan berikutnya WIB). */
  awalBulan: string
  jenisKode?: string
  peran?: string
}

/**
 * Surat terbit pada bulan itu menurut WIB. Rentang setengah terbuka atas `terbit_pada` (memakai indeks permohonan_desa_terbit),
 * dihitung di SQL supaya pergantian bulan dan tahun tidak bergantung pada aritmetika tanggal di aplikasi.
 */
const syaratKeluar = (s: SaringanKeluar): SQL | undefined =>
  and(
    sql`${permohonan.terbitPada} >= (${s.awalBulan}::date::timestamp at time zone 'Asia/Jakarta')`,
    sql`${permohonan.terbitPada} < ((${s.awalBulan}::date + interval '1 month')::timestamp at time zone 'Asia/Jakarta')`,
    s.dusunSaja === null ? undefined : eq(permohonan.dusunId, s.dusunSaja),
    s.jenisKode === undefined ? undefined : eq(jenisSurat.kode, s.jenisKode),
    s.peran === undefined ? undefined : sql`${permohonan.terbitPenandatangan} ->> 'peran' = ${s.peran}`,
  )

/** Surat keluar menurut nomor urut, lalu waktu terbit, lalu id (nomor urut bisa sama antar jenis). `halaman` memotong; tanpa itu semuanya. */
export function bacaSuratKeluar(db: Db, s: SaringanKeluar, halaman?: { batas: number; lewati: number }): Promise<RekamSuratKeluar[]> {
  const untuk = alias(penduduk, 'untuk')
  let kueri = db
    .select({
      id: permohonan.id,
      nomor: permohonan.terbitNomor,
      urut: permohonan.terbitUrut,
      terbitPada: permohonan.terbitPada,
      status: permohonan.status,
      kanal: permohonan.kanal,
      penandatangan: permohonan.terbitPenandatangan,
      jenisKode: jenisSurat.kode,
      jenisNama: jenisSurat.nama,
      untukNama: untuk.nama,
    })
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .leftJoin(untuk, sql`${untuk.id} = coalesce(${permohonan.subjekId}, ${permohonan.pemohonId})`)
    .where(syaratKeluar(s))
    .orderBy(asc(permohonan.terbitUrut), asc(permohonan.terbitPada), asc(permohonan.id))
    .$dynamic()
  if (halaman) kueri = kueri.limit(halaman.batas).offset(halaman.lewati)
  return kueri
}

export async function hitungSuratKeluar(db: Db, s: SaringanKeluar): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .where(syaratKeluar(s))
  return n
}

const syaratMasuk = (awalBulan: string): SQL =>
  sql`${suratMasuk.diterima} >= ${awalBulan}::date and ${suratMasuk.diterima} < (${awalBulan}::date + interval '1 month')`

/** Register surat masuk bulan terima itu, urut tanggal terima lalu nomor agenda. */
export function bacaSuratMasukBulan(db: Db, awalBulan: string, halaman: { batas: number; lewati: number }): Promise<RekamSuratMasuk[]> {
  return db
    .select()
    .from(suratMasuk)
    .where(syaratMasuk(awalBulan))
    .orderBy(asc(suratMasuk.diterima), asc(suratMasuk.noAgenda))
    .limit(halaman.batas)
    .offset(halaman.lewati)
}

export async function hitungSuratMasukBulan(db: Db, awalBulan: string): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(suratMasuk).where(syaratMasuk(awalBulan))
  return n
}

export async function bacaSuratMasukSatu(db: Db, id: string): Promise<RekamSuratMasuk | undefined> {
  const [b] = await db.select().from(suratMasuk).where(eq(suratMasuk.id, id)).limit(1)
  return b
}

export async function sisipSuratMasuk(db: Db, b: BarisSuratMasukBaru): Promise<void> {
  await db.insert(suratMasuk).values(b)
}

/**
 * Nomor agenda berikutnya untuk desa dan tahun terima itu, di bawah kunci penasihat transaksi: dua pencatatan serentak antre,
 * jadi nomornya berurutan tanpa ganda. Indeks unik `(desa_id, tahun, no_agenda)` tetap menjadi sabuk kedua. Wajib dalam transaksi
 * permintaan (kunci dilepas saat transaksi selesai).
 */
export async function noAgendaBerikut(db: Db, desaId: string, tahun: number): Promise<number> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`surat-masuk-agenda:${desaId}:${tahun}`}, 0))`)
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${suratMasuk.noAgenda}), 0)`.mapWith(Number) })
    .from(suratMasuk)
    .where(and(eq(suratMasuk.desaId, desaId), eq(suratMasuk.tahun, tahun)))
  return n + 1
}
