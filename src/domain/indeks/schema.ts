import { z } from 'zod'
import { KATEGORI_DESA, KATEGORI_KABUPATEN, TINGKATAN } from './kategori'
import { MUSIM } from './periode'

const kodeNama = z.object({ kode: z.string(), nama: z.string() })
const desaPapan = z.strictObject({ id: z.string(), nama: z.string(), kecamatan: z.string() })

export const kategoriDesaSchema = z.enum(KATEGORI_DESA)
export const kategoriKabupatenSchema = z.enum(KATEGORI_KABUPATEN)
export const musimSchema = z.enum(MUSIM)
export const tingkatanSchema = z.enum(TINGKATAN)

/** GET /kabupaten/indeks: papan satu kategori untuk satu periode, ditambah podium se-provinsi (SPEC-V0.2 §9.4, §9.5). */
export const papanIndeksSchema = z.object({
  kabupaten: kodeNama,
  musim: musimSchema,
  periode: z.object({ kode: z.string(), label: z.string(), berjalan: z.boolean(), tutupPada: z.string() }),
  daftarPeriode: z.array(z.object({ kode: z.string(), label: z.string(), berjalan: z.boolean() })),
  kategori: kategoriDesaSchema,
  kecamatan: kodeNama.nullable(),
  daftarKecamatan: z.array(kodeNama),
  peringkat: z.array(
    z.strictObject({
      peringkat: z.number().int().min(1),
      bersama: z.boolean(),
      desa: desaPapan,
      ukuran: z.number(),
      /** Hanya untuk tujuh kategori berskor. */
      skor: z.number().nullable(),
      /** Hanya untuk Juara Umum. */
      tingkatan: tingkatanSchema.nullable(),
    }),
  ),
  belumMemenuhi: z.array(z.strictObject({ desa: desaPapan, alasan: z.string() })),
  tidakIkut: z.number().int().min(0),
  /** Null tanpa filter kecamatan; true bila paling sedikit 3 desa memenuhi syarat. */
  podiumKecamatan: z.boolean().nullable(),
  provinsi: z.object({
    provinsi: kodeNama,
    kategori: z.array(
      z.object({
        kategori: kategoriKabupatenSchema,
        posisi: z.object({ peringkat: z.number().int().min(1), bersama: z.boolean(), dari: z.number().int().min(1), nilai: z.number() }).nullable(),
        alasan: z.string().nullable(),
        podium: z.array(z.object({ peringkat: z.number().int().min(1), bersama: z.boolean(), kabupaten: kodeNama, nilai: z.number() })),
      }),
    ),
  }),
})
export type PapanIndeks = z.infer<typeof papanIndeksSchema>

/** Ringkasan di Beranda dasbor kabupaten (SPEC-V0.2 §8.3 butir 1). */
export const ringkasIndeksSchema = z.object({
  periode: z.object({ kode: z.string(), label: z.string() }),
  rataRata: z.number().nullable(),
  sebaran: z.record(tingkatanSchema, z.number().int().min(0)),
  tanpaIndeks: z.number().int().min(0),
  posisiProvinsi: z.object({ peringkat: z.number().int().min(1), dari: z.number().int().min(1), provinsi: z.string() }).nullable(),
})
export type RingkasIndeks = z.infer<typeof ringkasIndeksSchema>

/** Podium bulan laporan, satu blok per kategori desa. */
export const podiumLaporanSchema = z.array(
  z.object({
    kategori: kategoriDesaSchema,
    juara: z.array(z.object({ peringkat: z.number().int().min(1), bersama: z.boolean(), nama: z.string(), kecamatan: z.string(), nilai: z.number() })),
  }),
)
export type PodiumLaporan = z.infer<typeof podiumLaporanSchema>

/** Parameter URL papan Indeks: semuanya opsional dan berupa teks. Isi sahnya diperiksa handler, bukan skema ini. */
export const filterPapanIndeksSchema = z.object({
  musim: musimSchema.optional(),
  periode: z.string().optional(),
  kategori: kategoriDesaSchema.optional(),
  kecamatan: z.string().optional(),
})
export type FilterPapanIndeks = z.infer<typeof filterPapanIndeksSchema>
