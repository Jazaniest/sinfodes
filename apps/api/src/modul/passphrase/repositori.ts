import { eq, sql as dsql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { passphraseTandaTangan } from '../../basisdata/skema'

/** Hash passphrase pengguna, atau null bila belum ditetapkan. */
export async function bacaHashPassphrase(db: Db, penggunaId: string): Promise<string | null> {
  const [b] = await db.select({ hash: passphraseTandaTangan.hash }).from(passphraseTandaTangan).where(eq(passphraseTandaTangan.penggunaId, penggunaId)).limit(1)
  return b?.hash ?? null
}

/** Menetapkan atau mengganti hash passphrase (satu baris per pengguna). */
export async function simpanHashPassphrase(db: Db, m: { penggunaId: string; desaId: string; hash: string; sekarang: Date }): Promise<void> {
  await db
    .insert(passphraseTandaTangan)
    .values({ penggunaId: m.penggunaId, desaId: m.desaId, hash: m.hash, diaturPada: m.sekarang })
    .onConflictDoUpdate({ target: passphraseTandaTangan.penggunaId, set: { hash: m.hash, diaturPada: m.sekarang } })
}

/**
 * Kunci penasihat per pengguna, dilepas saat transaksi berakhir. Menyerialkan semua percobaan passphrase satu pengguna: tanpa
 * ini, tebakan serentak dari satu sesi sama-sama lolos pemeriksaan kunci sebelum hitungan kegagalan naik (rencana 8F2b Ruling 4).
 * Urutan kunci tetap: baris permohonan, lalu kunci ini, lalu kunci nomor.
 */
export async function kunciPercobaanPassphrase(db: Db, desaId: string, penggunaId: string): Promise<void> {
  await db.execute(dsql`select pg_advisory_xact_lock(hashtextextended(${`passphrase:${desaId}:${penggunaId}`}, 0))`)
}
