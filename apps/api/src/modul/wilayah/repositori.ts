import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { desa, dusun, keluarga, penduduk, pengguna } from '../../basisdata/skema'

export type BarisDusunBaru = typeof dusun.$inferInsert

/** Apakah desa pada konteks sudah punya penduduk atau KK? Sejak itu susunan dusun, RW, dan RT terkunci. */
export async function adaDataKependudukan(db: Db): Promise<boolean> {
  const [p] = await db.select({ id: penduduk.id }).from(penduduk).limit(1)
  if (p) return true
  const [k] = await db.select({ id: keluarga.id }).from(keluarga).limit(1)
  return k !== undefined
}

/** Akun Kepala Dusun yang masih bertugas di dusun-dusun ini. */
export const akunKadusDi = (db: Db, dusunIds: readonly string[]): Promise<{ id: string; nama: string; jabatan: string; dusunId: string | null }[]> =>
  dusunIds.length === 0
    ? Promise.resolve([])
    : db
        .select({ id: pengguna.id, nama: pengguna.nama, jabatan: pengguna.jabatan, dusunId: pengguna.dusunId })
        .from(pengguna)
        .where(and(eq(pengguna.peran, 'kadus'), inArray(pengguna.dusunId, [...dusunIds])))

export const ubahJabatan = async (db: Db, penggunaId: string, jabatan: string): Promise<void> => {
  await db.update(pengguna).set({ jabatan }).where(eq(pengguna.id, penggunaId))
}

export const hapusDusun = async (db: Db, ids: readonly string[]): Promise<void> => {
  if (ids.length > 0) await db.delete(dusun).where(inArray(dusun.id, [...ids]))
}

/**
 * Menggeser semua nomor dusun desa ke atas agar penomoran ulang tidak menabrak indeks unik `(desa_id, nomor)` di tengah
 * jalan (mis. dua dusun bertukar urutan). Nomor akhir ditetapkan segera sesudahnya, dalam transaksi yang sama.
 */
export const geserNomorDusun = async (db: Db): Promise<void> => {
  await db.update(dusun).set({ nomor: sql`${dusun.nomor} + 1000` })
}

export const sisipDusun = async (db: Db, baris: BarisDusunBaru): Promise<void> => {
  await db.insert(dusun).values(baris)
}

export const ubahDusun = async (db: Db, id: string, ubah: Partial<Omit<BarisDusunBaru, 'id' | 'desaId'>>): Promise<void> => {
  await db.update(dusun).set(ubah).where(eq(dusun.id, id))
}

export const ubahIstilahWilayah = async (db: Db, desaId: string, istilah: Desa['istilahWilayah']): Promise<void> => {
  await db.update(desa).set({ istilahWilayah: istilah }).where(eq(desa.id, desaId))
}
