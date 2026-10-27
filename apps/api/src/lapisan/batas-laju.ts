import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context, MiddlewareHandler } from 'hono'
import { GalatApp } from '../galat'
import type { Waktu } from '../waktu'

/** Pembatas jendela geser di memori aplikasi (SPEC-V0.3 §8.4). Hilang saat server dimulai ulang; kunci per akun ikut 8D. */
export type BatasLaju = {
  /** Sudah sebanyak `maks` kejadian dalam jendela? */
  tercapai(kunci: string): boolean
  catat(kunci: string): void
  /** Jumlah kunci yang sedang dipantau (untuk uji batas memori). */
  ukuran(): number
}

const MAKS_KUNCI = 10_000

export function buatBatasLaju(opsi: { maks: number; jendelaMs: number; waktu: Waktu }): BatasLaju {
  const catatan = new Map<string, number[]>()
  const segarkan = (kunci: string, sekarang: number): number[] => {
    const baru = (catatan.get(kunci) ?? []).filter((t) => sekarang - t < opsi.jendelaMs)
    if (baru.length === 0) catatan.delete(kunci)
    else catatan.set(kunci, baru)
    return baru
  }
  return {
    tercapai: (kunci) => segarkan(kunci, opsi.waktu().getTime()).length >= opsi.maks,
    catat(kunci) {
      const sekarang = opsi.waktu().getTime()
      if (!catatan.has(kunci) && catatan.size >= MAKS_KUNCI) {
        // Penuh: buang kunci tertua (urutan penyisipan Map) agar memori tidak tumbuh tanpa batas.
        catatan.delete(catatan.keys().next().value as string)
      }
      const baru = segarkan(kunci, sekarang)
      baru.push(sekarang)
      catatan.set(kunci, baru)
    },
    ukuran: () => catatan.size,
  }
}

export const PESAN_TERLALU_SERING = 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'

/** Menolak sebelum rute berjalan bila kunci sudah mencapai batas; rute sendiri yang mencatat kejadian (mis. masuk gagal). */
export const batasiLaju =
  (batas: BatasLaju, kunci: (c: Context) => string): MiddlewareHandler =>
  async (c, next) => {
    if (batas.tercapai(kunci(c))) throw new GalatApp('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
    await next()
  }

/** Alamat IP sambungan langsung. Di belakang proksi (8K) sumbernya diganti pembaca header tepercaya yang disetel eksplisit. */
export function ipSoket(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? 'tak-dikenal'
  } catch {
    return 'tak-dikenal'
  }
}
