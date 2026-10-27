import { and, eq } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { penggunaKabupaten } from '../../basisdata/skema'

/** Pengguna kabupaten di kabupaten alamat ini menurut email huruf kecil, atau null (peran `kabupaten`). */
export async function cariPenggunaKabupaten(db: Db, kodeKabupaten: string, emailKecil: string): Promise<typeof penggunaKabupaten.$inferSelect | null> {
  const [b] = await db
    .select()
    .from(penggunaKabupaten)
    .where(and(eq(penggunaKabupaten.kabupatenKode, kodeKabupaten), eq(penggunaKabupaten.email, emailKecil)))
    .limit(1)
  return b ?? null
}
