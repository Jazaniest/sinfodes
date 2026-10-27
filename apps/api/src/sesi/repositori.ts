import { PERAN, type PenggunaSesi } from '@sinfodes/kontrak/pengguna/schema'
import { eq } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'
import { pengguna, sesi } from '../basisdata/skema'

/** Sesi panel menganggur lebih dari ini berakhir (SPEC-V0.3 §8.1). */
export const BATAS_MENGANGGUR_MS = 2 * 3600_000
/** Sesi panel berumur lebih dari ini berakhir walau terus dipakai. */
export const BATAS_MUTLAK_MS = 12 * 3600_000
/** `terakhir_aktif` hanya ditulis bila sudah lebih lama dari ini, supaya setiap permintaan tidak menjadi tulisan. */
export const JEDA_PERBARUI_MS = 60_000

export type SesiDitemukan = {
  sesi: typeof sesi.$inferSelect
  pengguna: typeof pengguna.$inferSelect
}

/** Mencari sesi lewat hash token. RLS membatasi pencarian pada desa dari alamat permintaan. */
export async function cariSesiMenurutHash(db: Db, tokenHash: string): Promise<SesiDitemukan | null> {
  const [b] = await db.select({ sesi, pengguna }).from(sesi).innerJoin(pengguna, eq(pengguna.id, sesi.penggunaId)).where(eq(sesi.tokenHash, tokenHash)).limit(1)
  return b ?? null
}

/**
 * Sesi masih berlaku? Memeriksa semuanya sekali lagi di kode, bukan hanya mengandalkan RLS: desa sama dengan alamat, jenis
 * panel, tidak dicabut, belum melewati batas mutlak atau batas menganggur, dan akunnya masih aktif.
 */
export function sesiBerlaku(d: SesiDitemukan, desaId: string, sekarang: Date): boolean {
  const t = sekarang.getTime()
  return (
    d.sesi.desaId === desaId &&
    d.pengguna.desaId === desaId &&
    d.sesi.jenis === 'panel' &&
    d.sesi.dicabut === null &&
    d.pengguna.aktif &&
    t < d.sesi.kedaluwarsaMutlak.getTime() &&
    t - d.sesi.terakhirAktif.getTime() < BATAS_MENGANGGUR_MS
  )
}

export function penggunaSesiDari(b: typeof pengguna.$inferSelect): PenggunaSesi | null {
  const peran = (PERAN as readonly string[]).includes(b.peran) ? (b.peran as PenggunaSesi['peran']) : null
  if (!peran) return null
  return { id: b.id, desaId: b.desaId, nama: b.nama, jabatan: b.jabatan, peran, dusunId: b.dusunId, email: b.email, aktif: b.aktif, nip: b.nip }
}

export async function geserAktif(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesi).set({ terakhirAktif: sekarang }).where(eq(sesi.id, sesiId))
}

export async function simpanSesi(
  db: Db,
  s: { id: string; desaId: string; penggunaId: string; tokenHash: string; sekarang: Date },
): Promise<void> {
  await db.insert(sesi).values({
    id: s.id,
    desaId: s.desaId,
    penggunaId: s.penggunaId,
    jenis: 'panel',
    tokenHash: s.tokenHash,
    dibuat: s.sekarang,
    terakhirAktif: s.sekarang,
    kedaluwarsaMutlak: new Date(s.sekarang.getTime() + BATAS_MUTLAK_MS),
    dicabut: null,
  })
}

export async function cabutSesi(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesi).set({ dicabut: sekarang }).where(eq(sesi.id, sesiId))
}

/** Pengguna desa (dibatasi RLS ke desa pada konteks) menurut email huruf kecil, atau null. */
export async function cariPenggunaMenurutEmail(db: Db, emailKecil: string): Promise<typeof pengguna.$inferSelect | null> {
  const [b] = await db.select().from(pengguna).where(eq(pengguna.email, emailKecil)).limit(1)
  return b ?? null
}
