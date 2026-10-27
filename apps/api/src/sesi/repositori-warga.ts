import { eq } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'
import { penduduk, sesiWarga } from '../basisdata/skema'

export type SesiWargaDitemukan = { sesi: typeof sesiWarga.$inferSelect; statusDasar: string }

/** Sesi warga lewat hash token. RLS membatasi pencarian pada desa dari alamat permintaan; warga harus masih berstatus Hidup. */
export async function cariSesiWargaMenurutHash(db: Db, tokenHash: string): Promise<SesiWargaDitemukan | null> {
  const [b] = await db
    .select({ sesi: sesiWarga, statusDasar: penduduk.statusDasar })
    .from(sesiWarga)
    .innerJoin(penduduk, eq(penduduk.id, sesiWarga.pendudukId))
    .where(eq(sesiWarga.tokenHash, tokenHash))
    .limit(1)
  return b ?? null
}

export async function geserAktifWarga(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiWarga).set({ terakhirAktif: sekarang }).where(eq(sesiWarga.id, sesiId))
}

export async function simpanSesiWarga(db: Db, s: { id: string; desaId: string; pendudukId: string; tokenHash: string; sekarang: Date }): Promise<void> {
  await db.insert(sesiWarga).values({
    id: s.id,
    desaId: s.desaId,
    pendudukId: s.pendudukId,
    tokenHash: s.tokenHash,
    dibuat: s.sekarang,
    terakhirAktif: s.sekarang,
    dicabut: null,
  })
}

export async function cabutSesiWarga(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiWarga).set({ dicabut: sekarang }).where(eq(sesiWarga.id, sesiId))
}
