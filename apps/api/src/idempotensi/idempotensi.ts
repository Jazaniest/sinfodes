import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'
import { kunciIdempotensi } from '../basisdata/skema'
import { GalatApp } from '../galat'

/** Bentuk kunci yang diterima; CHECK migrasi 0009 menjaga hal yang sama di basis data. */
export const POLA_KUNCI = /^[A-Za-z0-9_-]{8,64}$/

export const sidikIsi = (jalur: string, isi: unknown): string => createHash('sha256').update(`${jalur}\n${JSON.stringify(isi ?? null)}`).digest('hex')

type Konteks = { db: Db; pelakuId: string; desaId: string; sekarang: Date }
type Parameter<T> = {
  /** Nilai header `Idempotency-Key`; tanpa header, `jalankan` dijalankan seperti biasa. */
  kunci: string | undefined
  jalur: string
  isi: unknown
  jalankan: () => Promise<{ hasil: T; mutasiId: string }>
  /** Membentuk jawaban dari mutasi yang sudah tersimpan (kunci terpakai oleh permintaan yang sudah selesai). */
  pulihkan: (mutasiId: string) => Promise<T>
}

/**
 * Menjalankan penulisan yang tidak boleh ganda bila dikirim ulang. Kunci dipesan dengan `INSERT ... ON CONFLICT DO NOTHING` di
 * dalam transaksi permintaan: permintaan serentak dengan kunci yang sama menunggu pemesan pertama selesai (penguncian indeks
 * unik), lalu mendapat jawaban ulang; bila pemesan pertama batal (galat), pesanannya ikut batal dan yang menunggu melanjutkan.
 * Kunci yang sama dengan isian atau jalur berbeda ditolak 409.
 */
export async function denganIdempotensi<T>(k: Konteks, p: Parameter<T>): Promise<{ hasil: T; diulang: boolean }> {
  if (p.kunci === undefined) return { hasil: (await p.jalankan()).hasil, diulang: false }
  if (!POLA_KUNCI.test(p.kunci)) throw new GalatApp('VALIDATION', 'Kunci idempotensi tidak valid.', 422)
  const sidik = sidikIsi(p.jalur, p.isi)
  const dipesan = await k.db
    .insert(kunciIdempotensi)
    .values({ desaId: k.desaId, penggunaId: k.pelakuId, kunci: p.kunci, jalur: p.jalur, sidikIsi: sidik, dibuat: k.sekarang })
    .onConflictDoNothing()
    .returning({ kunci: kunciIdempotensi.kunci })
  if (dipesan.length > 0) {
    const jalan = await p.jalankan()
    await k.db
      .update(kunciIdempotensi)
      .set({ mutasiId: jalan.mutasiId })
      .where(and(eq(kunciIdempotensi.desaId, k.desaId), eq(kunciIdempotensi.penggunaId, k.pelakuId), eq(kunciIdempotensi.kunci, p.kunci)))
    return { hasil: jalan.hasil, diulang: false }
  }
  const [ada] = await k.db
    .select({ sidikIsi: kunciIdempotensi.sidikIsi, mutasiId: kunciIdempotensi.mutasiId })
    .from(kunciIdempotensi)
    .where(and(eq(kunciIdempotensi.desaId, k.desaId), eq(kunciIdempotensi.penggunaId, k.pelakuId), eq(kunciIdempotensi.kunci, p.kunci)))
  if (!ada || ada.sidikIsi !== sidik || ada.mutasiId === null) {
    throw new GalatApp('CONFLICT', 'Kunci idempotensi ini sudah dipakai untuk isian yang berbeda.', 409)
  }
  return { hasil: await p.pulihkan(ada.mutasiId), diulang: true }
}
