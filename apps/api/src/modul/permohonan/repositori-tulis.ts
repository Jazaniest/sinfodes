import { and, eq, isNotNull, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { jenisSurat, permohonan, permohonanSisip, riwayatSurat } from '../../basisdata/skema'

export type BarisPermohonanBaru = typeof permohonanSisip.$inferInsert
export type BarisRiwayatSuratBaru = typeof riwayatSurat.$inferInsert
/**
 * Kolom `permohonan` yang boleh diubah peran desa: kolom penanganan (hak kolom migrasi 0012) dan kolom penerbitan, pembatalan,
 * dan serah terima (migrasi 0013, dijaga pemicu `permohonan_beku`). Uji meta mencocokkan daftar ini dengan hak kolom basis data.
 */
export const KOLOM_UBAH_PERMOHONAN = [
  'isianSandi', 'status', 'tahap', 'dikembalikan', 'penolakan', 'ditutupPada', 'catatanInternal',
  'terbitNomor', 'terbitTahun', 'terbitUrut', 'terbitKode', 'terbitPada', 'terbitPenandatangan', 'terbitMode', 'terbitBerlakuSampai',
  'terbitLembarSandi', 'terbitTataLetak', 'terbitKop', 'hashDokumen', 'tandaTangan', 'pembatalan', 'diambil',
] as const satisfies readonly (keyof typeof permohonan.$inferInsert)[]
export type KolomUbahPermohonan = Partial<Pick<typeof permohonan.$inferInsert, (typeof KOLOM_UBAH_PERMOHONAN)[number]>>

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

/**
 * Kunci penasihat pengajuan seorang warga: penghitungan pengajuan Menunggu dan sisipnya berjalan satu per satu, jadi lima
 * pengajuan serentak pun tidak melampaui batas (8F3 Ruling 4). Urutan kunci tetap: jenis (FOR SHARE), kunci ini, lalu nomor urut.
 * Dilepas saat transaksi selesai.
 */
export async function kunciPengajuanWarga(db: Db, desaId: string, pendudukId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`ajukan-warga:${desaId}:${pendudukId}`}, 0))`)
}

/**
 * Kunci penasihat nomor surat terbit untuk desa dan tahun itu, dilepas saat transaksi selesai. Satu kunci menutup kedua mode
 * urutan: `per-tahun` menghitung semua jenis, `per-jenis` satu jenis (rencana 8F2b Ruling 6). Urutan kunci tetap: baris
 * permohonan, kunci pengguna (passphrase), lalu kunci ini.
 */
export async function kunciNomorTerbit(db: Db, desaId: string, tahun: number): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`permohonan-nomor-terbit:${desaId}:${tahun}`}, 0))`)
}

/**
 * Nomor urut terbit tertinggi per kode jenis pada desa dan tahun itu, termasuk surat yang dibatalkan (nomornya tidak dipakai ulang).
 * Hanya agregat; aturan "berikutnya" tetap di `urutBerikutnya` kontrak, bukan disalin ke SQL.
 */
export async function bacaUrutTerbitTertinggi(db: Db, desaId: string, tahun: number): Promise<{ jenisKode: string; urut: number }[]> {
  return db
    .select({ jenisKode: jenisSurat.kode, urut: sql<number>`max(${permohonan.terbitUrut})`.mapWith(Number) })
    .from(permohonan)
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .where(and(eq(permohonan.desaId, desaId), eq(permohonan.terbitTahun, tahun), isNotNull(permohonan.terbitUrut)))
    .groupBy(jenisSurat.kode)
}

/** Apakah kode verifikasi itu sudah dipakai surat lain di desa ini. */
export async function kodeVerifikasiAda(db: Db, desaId: string, kode: string): Promise<boolean> {
  const [b] = await db.select({ id: permohonan.id }).from(permohonan).where(and(eq(permohonan.desaId, desaId), eq(permohonan.terbitKode, kode))).limit(1)
  return b !== undefined
}
