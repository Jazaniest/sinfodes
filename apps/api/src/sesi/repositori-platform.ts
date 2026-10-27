import { eq } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'
import { kabupatenMitra, penggunaKabupaten, penggunaKonsol, sesiKabupaten, sesiKonsol } from '../basisdata/skema'
import { ATURAN_SESI } from './pelaku'

/** Sesi Konsol (peran `konsol`) dan sesi kabupaten (peran `kabupaten`): tabel lintas desa, dipisah dengan hak tabel. */
export type SesiKonsolDitemukan = { sesi: typeof sesiKonsol.$inferSelect; pengguna: typeof penggunaKonsol.$inferSelect }
export type SesiKabupatenDitemukan = {
  sesi: typeof sesiKabupaten.$inferSelect
  pengguna: typeof penggunaKabupaten.$inferSelect
  mitra: typeof kabupatenMitra.$inferSelect
}

export async function cariSesiKonsolMenurutHash(db: Db, tokenHash: string): Promise<SesiKonsolDitemukan | null> {
  const [b] = await db
    .select({ sesi: sesiKonsol, pengguna: penggunaKonsol })
    .from(sesiKonsol)
    .innerJoin(penggunaKonsol, eq(penggunaKonsol.id, sesiKonsol.penggunaId))
    .where(eq(sesiKonsol.tokenHash, tokenHash))
    .limit(1)
  return b ?? null
}

export async function cariSesiKabupatenMenurutHash(db: Db, tokenHash: string): Promise<SesiKabupatenDitemukan | null> {
  const [b] = await db
    .select({ sesi: sesiKabupaten, pengguna: penggunaKabupaten, mitra: kabupatenMitra })
    .from(sesiKabupaten)
    .innerJoin(penggunaKabupaten, eq(penggunaKabupaten.id, sesiKabupaten.penggunaId))
    .innerJoin(kabupatenMitra, eq(kabupatenMitra.kode, sesiKabupaten.kabupatenKode))
    .where(eq(sesiKabupaten.tokenHash, tokenHash))
    .limit(1)
  return b ?? null
}

export async function geserAktifKonsol(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiKonsol).set({ terakhirAktif: sekarang }).where(eq(sesiKonsol.id, sesiId))
}

export async function geserAktifKabupaten(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiKabupaten).set({ terakhirAktif: sekarang }).where(eq(sesiKabupaten.id, sesiId))
}

export async function simpanSesiKonsol(db: Db, s: { id: string; penggunaId: string; tokenHash: string; sekarang: Date }): Promise<void> {
  await db.insert(sesiKonsol).values({
    id: s.id,
    penggunaId: s.penggunaId,
    tokenHash: s.tokenHash,
    dibuat: s.sekarang,
    terakhirAktif: s.sekarang,
    kedaluwarsaMutlak: new Date(s.sekarang.getTime() + (ATURAN_SESI.konsol.mutlakMs as number)),
    dicabut: null,
  })
}

export async function simpanSesiKabupaten(db: Db, s: { id: string; penggunaId: string; kabupatenKode: string; tokenHash: string; sekarang: Date }): Promise<void> {
  await db.insert(sesiKabupaten).values({
    id: s.id,
    penggunaId: s.penggunaId,
    kabupatenKode: s.kabupatenKode,
    tokenHash: s.tokenHash,
    dibuat: s.sekarang,
    terakhirAktif: s.sekarang,
    kedaluwarsaMutlak: new Date(s.sekarang.getTime() + (ATURAN_SESI.kabupaten.mutlakMs as number)),
    dicabut: null,
  })
}

export async function cabutSesiKonsol(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiKonsol).set({ dicabut: sekarang }).where(eq(sesiKonsol.id, sesiId))
}

export async function cabutSesiKabupaten(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiKabupaten).set({ dicabut: sekarang }).where(eq(sesiKabupaten.id, sesiId))
}
