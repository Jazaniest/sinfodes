import { eq } from 'drizzle-orm'
import type { Db } from './klien'
import { kabupatenMitra } from './skema'

/** Kabupaten mitra menurut label alamat (mis. `kab-pelalawan`), atau null. Dibaca peran `publik` untuk memetakan alamat. */
export async function cariKabupatenMitra(db: Db, label: string): Promise<{ kode: string; nama: string; label: string } | null> {
  const [b] = await db.select({ kode: kabupatenMitra.kode, nama: kabupatenMitra.nama, label: kabupatenMitra.label }).from(kabupatenMitra).where(eq(kabupatenMitra.label, label)).limit(1)
  return b ?? null
}
