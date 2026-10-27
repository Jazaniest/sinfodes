import { z } from 'zod'
import { tanggalIsoWib } from '../format/tanggal'
import { podiumLaporanSchema } from '../indeks/schema'

/** Paling banyak 12 bulan ke belakang: sama dengan rentang surat per bulan yang tersimpan (SPEC §11). */
const BATAS_BULAN = 12

/** "YYYY-MM" dengan bulan 01-12. */
export const bulanLaporanSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Bulan tidak sah')

const geserBulan = (bulan: string, n: number): string => {
  const u = Number(bulan.slice(0, 4)) * 12 + Number(bulan.slice(5, 7)) - 1 + n
  return `${Math.floor(u / 12)}-${String((u % 12) + 1).padStart(2, '0')}`
}

/** "2026-02" → "2026-02-28". */
export const akhirBulan = (bulan: string): string =>
  new Date(Date.parse(`${geserBulan(bulan, 1)}-01T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

/**
 * Bulan laporan yang tersedia (SPEC-V0.2 §8.3 butir 7): bulan yang sudah tutup, dari bulan lalu (WIB) mundur sampai bulan
 * kabupaten bergabung, paling banyak 12. Terbaru dulu.
 */
export function bulanLaporanTersedia(bergabung: string, sekarang: Date): string[] {
  const mulai = bergabung.slice(0, 7)
  const hasil: string[] = []
  for (let b = geserBulan(tanggalIsoWib(sekarang).slice(0, 7), -1); b >= mulai && hasil.length < BATAS_BULAN; b = geserBulan(b, -1)) hasil.push(b)
  return hasil
}

const jumlah = z.number().int().min(0)
const rupiah = z.number().min(0)
const kodeNama = z.object({ kode: z.string(), nama: z.string() })

export const desaRingkasSchema = z.object({ nama: z.string(), kecamatan: z.string() })
export type DesaRingkas = z.infer<typeof desaRingkasSchema>

/** GET /kabupaten/laporan: bulan yang laporannya tersedia. */
export const daftarLaporanSchema = z.object({ bulan: z.array(bulanLaporanSchema) })

/**
 * GET /kabupaten/laporan/:bulan (SPEC-V0.2 §8.3 butir 7). Semua angka per akhir bulan itu: desa bergabung, surat terbit
 * sepanjang bulan, dan realisasi belanja APBDes sampai akhir bulan. Dana Desa hanya untuk desa yang bergabung pada akhir bulan.
 * `podium`: juara bulan itu per kategori desa (SPEC-V0.2 §9.5).
 */
export const laporanBulananSchema = z.object({
  kabupaten: z.object({ kode: z.string(), nama: z.string(), label: z.string() }),
  bulan: bulanLaporanSchema,
  dibuatPada: z.iso.datetime({ offset: true }),
  ringkasan: z.object({
    jumlahDesa: jumlah,
    bergabung: jumlah,
    suratTerbit: jumlah,
    danaDesa: z.object({ tahun: z.number().int(), anggaran: rupiah, realisasi: rupiah, medianRealisasi: z.number().min(0).nullable(), tertinggal: jumlah }),
  }),
  kecamatan: z.array(z.object({ kecamatan: kodeNama, bergabung: jumlah, suratTerbit: jumlah, anggaran: rupiah, realisasi: rupiah })),
  podium: podiumLaporanSchema,
  perhatian: z.object({
    /** Desa bergabung tanpa satu pun surat terbit sepanjang bulan itu. */
    tanpaSurat: z.array(desaRingkasSchema),
    /** Realisasi lebih dari 15 poin di bawah median per akhir bulan. */
    tertinggal: z.array(desaRingkasSchema),
    /** Tenggat bertanggal di bulan itu dengan desa yang belum mengirim atau terlambat per akhir bulan. */
    tenggat: z.array(z.object({ nama: z.string(), tanggal: z.iso.date(), desa: z.array(desaRingkasSchema) })),
  }),
  desa: z.array(
    z.strictObject({
      nama: z.string(),
      kecamatan: z.string(),
      bergabung: z.boolean(),
      suratTerbit: jumlah,
      anggaran: rupiah.nullable(),
      realisasi: rupiah.nullable(),
      tertinggal: z.boolean(),
    }),
  ),
})
export type LaporanBulanan = z.infer<typeof laporanBulananSchema>
