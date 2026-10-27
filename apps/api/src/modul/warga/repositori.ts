import { and, eq, isNull, ne } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { akunWarga, penduduk, sesiWarga } from '../../basisdata/skema'

/** Warga dan akunnya menurut indeks HMAC NIK. RLS membatasi pencarian pada desa dari alamat permintaan. */
export async function cariWargaMenurutNikIndeks(db: Db, nikIndeks: string): Promise<{ id: string; statusDasar: string; pinHash: string } | null> {
  const [b] = await db
    .select({ id: penduduk.id, statusDasar: penduduk.statusDasar, pinHash: akunWarga.pinHash })
    .from(penduduk)
    .innerJoin(akunWarga, eq(akunWarga.pendudukId, penduduk.id))
    .where(eq(penduduk.nikIndeks, nikIndeks))
    .limit(1)
  return b ?? null
}

export type RekamWarga = {
  id: string
  desaId: string
  nama: string
  keluargaId: string
  nikSandi: string | null
  nikIndeks: string | null
  pinHash: string
  whatsappSandi: string
}

export async function ambilRekamWarga(db: Db, pendudukId: string): Promise<RekamWarga | null> {
  const [b] = await db
    .select({
      id: penduduk.id,
      desaId: penduduk.desaId,
      nama: penduduk.nama,
      keluargaId: penduduk.keluargaId,
      nikSandi: penduduk.nikSandi,
      nikIndeks: penduduk.nikIndeks,
      pinHash: akunWarga.pinHash,
      whatsappSandi: akunWarga.whatsappSandi,
    })
    .from(penduduk)
    .innerJoin(akunWarga, eq(akunWarga.pendudukId, penduduk.id))
    .where(eq(penduduk.id, pendudukId))
    .limit(1)
  return b ?? null
}

export async function ubahPin(db: Db, pendudukId: string, pinHash: string, sekarang: Date): Promise<void> {
  await db.update(akunWarga).set({ pinHash, diubah: sekarang }).where(eq(akunWarga.pendudukId, pendudukId))
}

export async function ubahWhatsapp(db: Db, pendudukId: string, whatsappSandi: string, sekarang: Date): Promise<void> {
  await db.update(akunWarga).set({ whatsappSandi, diubah: sekarang }).where(eq(akunWarga.pendudukId, pendudukId))
}

/** Mencabut semua sesi warga ini kecuali yang sedang dipakai (sesudah PIN diganti, perangkat lain harus masuk lagi). */
export async function cabutSesiLain(db: Db, pendudukId: string, kecualiSesiId: string, sekarang: Date): Promise<void> {
  await db
    .update(sesiWarga)
    .set({ dicabut: sekarang })
    .where(and(eq(sesiWarga.pendudukId, pendudukId), ne(sesiWarga.id, kecualiSesiId), isNull(sesiWarga.dicabut)))
}
