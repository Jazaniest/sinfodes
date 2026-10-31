import { and, eq } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'
import { berkasSurat } from '../basisdata/skema'

export type BarisBerkasBaru = typeof berkasSurat.$inferInsert
export type RekamBerkas = typeof berkasSurat.$inferSelect
/** Berkas dibaca bersama pemiliknya: sebuah permohonan (lampiran) atau sebuah surat masuk (pindaian), tidak pernah id berkas saja. */
export type KriteriaBerkas = { id: string } & ({ permohonanId: string } | { suratMasukId: string })

export async function sisipBerkas(db: Db, b: BarisBerkasBaru): Promise<void> {
  await db.insert(berkasSurat).values(b)
}

export async function bacaBarisBerkas(db: Db, k: KriteriaBerkas): Promise<RekamBerkas | undefined> {
  const pemilik = 'permohonanId' in k ? eq(berkasSurat.permohonanId, k.permohonanId) : eq(berkasSurat.suratMasukId, k.suratMasukId)
  const [baris] = await db.select().from(berkasSurat).where(and(eq(berkasSurat.id, k.id), pemilik)).limit(1)
  return baris
}
