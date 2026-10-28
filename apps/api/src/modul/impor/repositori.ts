import { and, eq, inArray, lt } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { imporPenduduk, keluarga, penduduk } from '../../basisdata/skema'

export type RekamImpor = typeof imporPenduduk.$inferSelect
export type BarisImporBaru = typeof imporPenduduk.$inferInsert

const KELOMPOK = 5000

export async function sisipSesiImpor(db: Db, baris: BarisImporBaru): Promise<void> {
  await db.insert(imporPenduduk).values(baris)
}

/** Satu sesi impor menurut id; RLS membatasi desa. Tidak ada = undefined. */
export async function bacaSesiImpor(db: Db, id: string): Promise<RekamImpor | undefined> {
  const [b] = await db.select().from(imporPenduduk).where(eq(imporPenduduk.id, id)).limit(1)
  return b
}

/** Mengunci sesi sampai transaksi selesai: dua konfirmasi serentak pada sesi yang sama berurutan, bukan sama-sama berjalan. */
export async function kunciSesiImpor(db: Db, id: string): Promise<RekamImpor | undefined> {
  const [b] = await db.select().from(imporPenduduk).where(eq(imporPenduduk.id, id)).limit(1).for('update')
  return b
}

/** Menghapus sesi desa pada konteks yang dibuat sebelum `batas` (RLS: desa lain tidak tersentuh). */
export async function hapusSesiKedaluwarsa(db: Db, batas: Date): Promise<void> {
  await db.delete(imporPenduduk).where(lt(imporPenduduk.dibuatPada, batas))
}

/** Menyelesaikan sesi: isi dikosongkan dan waktu selesai dicatat (hak kolom migrasi 0010). */
export async function tandaiSesiSelesai(db: Db, id: string, sekarang: Date): Promise<void> {
  await db.update(imporPenduduk).set({ isi: null, selesaiPada: sekarang }).where(and(eq(imporPenduduk.id, id)))
}

/** Indeks NIK (semua status, termasuk mantan penduduk) dan indeks nomor KK yang sudah ada di desa pada konteks. */
export async function bacaIndeksTerdaftar(db: Db, indeksNik: readonly string[], indeksKk: readonly string[]): Promise<{ nik: Set<string>; kk: Set<string> }> {
  const nik = new Set<string>()
  const kk = new Set<string>()
  for (let i = 0; i < indeksNik.length; i += KELOMPOK) {
    const baris = await db.select({ indeks: penduduk.nikIndeks }).from(penduduk).where(inArray(penduduk.nikIndeks, indeksNik.slice(i, i + KELOMPOK)))
    for (const b of baris) if (b.indeks !== null) nik.add(b.indeks)
  }
  for (let i = 0; i < indeksKk.length; i += KELOMPOK) {
    const baris = await db.select({ indeks: keluarga.nomorKkIndeks }).from(keluarga).where(inArray(keluarga.nomorKkIndeks, indeksKk.slice(i, i + KELOMPOK)))
    for (const b of baris) kk.add(b.indeks)
  }
  return { nik, kk }
}
