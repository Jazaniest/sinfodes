import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { pengguna } from '../../basisdata/skema'

export type Pejabat = { kades: string; sekdes: string; nipKades: string | null }

/**
 * Nama Kepala Desa dan Sekretaris Desa yang sedang menjabat (pengguna aktif berperan itu), untuk blok tanda tangan dan
 * pratinjau. Tanda "—" bila belum ada, sama dengan API tiruan. Bila ada dua akun aktif sama peran, yang tertua yang dipakai.
 */
export async function namaPejabat(db: Db, desaId: string): Promise<Pejabat> {
  const baris = await db
    .select({ peran: pengguna.peran, nama: pengguna.nama, nip: pengguna.nip })
    .from(pengguna)
    .where(and(eq(pengguna.desaId, desaId), eq(pengguna.aktif, true)))
    .orderBy(asc(pengguna.dibuat), asc(pengguna.id))
  const kades = baris.find((b) => b.peran === 'kades')
  return { kades: kades?.nama ?? '—', sekdes: baris.find((b) => b.peran === 'sekdes')?.nama ?? '—', nipKades: kades?.nip ?? null }
}
