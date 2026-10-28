import { and, eq, ne, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { keluarga, penduduk } from '../../basisdata/skema'
import type { RekamKeluarga, RekamPenduduk } from './repositori'

export type BarisPendudukBaru = typeof penduduk.$inferInsert
export type BarisKeluargaBaru = typeof keluarga.$inferInsert
export type PerubahanPenduduk = Partial<Omit<BarisPendudukBaru, 'id' | 'desaId'>>

/** Nama indeks unik NIK dan nomor KK per desa (migrasi 0001); dipakai untuk memetakan tabrakan serentak ke 409. */
export const INDEKS_NIK = 'penduduk_desa_nik'
export const INDEKS_KK = 'keluarga_desa_kk'

/** Pemilik NIK di desa pada konteks (RLS), termasuk mantan penduduk. `kecualiId` mengecualikan diri sendiri. */
export async function cariPemilikNik(db: Db, nikIndeks: string, kecualiId?: string): Promise<{ id: string; nama: string } | undefined> {
  const [b] = await db
    .select({ id: penduduk.id, nama: penduduk.nama })
    .from(penduduk)
    .where(and(eq(penduduk.nikIndeks, nikIndeks), kecualiId === undefined ? undefined : ne(penduduk.id, kecualiId)))
    .limit(1)
  return b
}

/** Mengunci baris KK sampai transaksi selesai: operasi pada KK yang sama berurutan, bukan saling menimpa. */
export async function kunciKeluarga(db: Db, id: string, dusunSaja: string | null): Promise<RekamKeluarga | undefined> {
  const [b] = await db
    .select()
    .from(keluarga)
    .where(and(eq(keluarga.id, id), dusunSaja === null ? undefined : eq(keluarga.dusunId, dusunSaja)))
    .limit(1)
    .for('update')
  return b
}

/** Urutan anggota baru di belakang anggota Hidup yang ada (0 bila KK belum punya anggota). */
export async function urutanBerikutnya(db: Db, keluargaId: string): Promise<number> {
  const [b] = await db
    .select({ n: sql<number>`coalesce(max(${penduduk.urutanKk}) + 1, 0)`.mapWith(Number) })
    .from(penduduk)
    .where(and(eq(penduduk.keluargaId, keluargaId), eq(penduduk.statusDasar, 'Hidup')))
  return b.n
}

export const sisipKeluarga = async (db: Db, baris: BarisKeluargaBaru): Promise<void> => {
  await db.insert(keluarga).values(baris)
}

export async function sisipPenduduk(db: Db, baris: BarisPendudukBaru): Promise<RekamPenduduk> {
  const [b] = await db.insert(penduduk).values(baris).returning()
  return b
}

export async function perbaruiPenduduk(db: Db, id: string, ubah: PerubahanPenduduk): Promise<RekamPenduduk> {
  const [b] = await db.update(penduduk).set(ubah).where(eq(penduduk.id, id)).returning()
  return b
}
