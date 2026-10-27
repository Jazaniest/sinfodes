import { and, eq, isNull, lt, or } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { penggunaKonsol } from '../../basisdata/skema'

/** Pengguna Konsol menurut email huruf kecil, atau null (peran `konsol`). */
export async function cariPenggunaKonsol(db: Db, emailKecil: string): Promise<typeof penggunaKonsol.$inferSelect | null> {
  const [b] = await db.select().from(penggunaKonsol).where(eq(penggunaKonsol.email, emailKecil)).limit(1)
  return b ?? null
}

/**
 * Menandai langkah TOTP sebagai terpakai, secara atomik: hanya berhasil bila langkah itu lebih baru daripada yang tercatat.
 * Dua permintaan serentak dengan kode yang sama tidak bisa sama-sama lolos.
 */
export async function klaimLangkahTotp(db: Db, penggunaId: string, langkah: number): Promise<boolean> {
  const baris = await db
    .update(penggunaKonsol)
    .set({ totpLangkahTerakhir: langkah })
    .where(and(eq(penggunaKonsol.id, penggunaId), or(isNull(penggunaKonsol.totpLangkahTerakhir), lt(penggunaKonsol.totpLangkahTerakhir, langkah))))
    .returning({ id: penggunaKonsol.id })
  return baris.length > 0
}
