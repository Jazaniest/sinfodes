import { z } from 'zod'
import { daftarBlokHtmlSchema } from './blok'
import { susunanSchema } from './susunan'
import { temaDasarSchema } from './tema'

/** `id` versi situs: `vrs_` + nomor urut (keputusan 7F-1). */
export const POLA_ID_VERSI = /^vrs_[0-9]+$/

/**
 * Satu versi tampilan website desa (SPEC-V0.2 11.6): tema Dasar, susunan blok, kapan, siapa, dan catatan terbitan.
 * `cssKustom` adalah teks asli untuk penyunting, `cssTerlingkup` hasil `periksaCss` untuk website publik, dan `blokHtml`
 * daftar kode HTML tingkat Lanjut (SPEC-V0.2 11.5, tahap 7G).
 */
export const versiSitusSchema = z.object({
  id: z.string().regex(POLA_ID_VERSI, 'Kode versi tidak sah.'),
  tema: temaDasarSchema,
  susunan: susunanSchema,
  cssKustom: z.string(),
  cssTerlingkup: z.string(),
  blokHtml: daftarBlokHtmlSchema,
  diperbarui: z.iso.datetime({ offset: true }),
  oleh: z.object({ id: z.string(), nama: z.string() }),
  catatan: z.string().max(200, 'Paling banyak 200 karakter.').nullable(),
})
export type VersiSitus = z.infer<typeof versiSitusSchema>

/**
 * Dokumen `situs` per desa (SPEC-V0.2 11.6). `terbit` dibaca website publik, `draf` disimpan penyunting, dan `riwayat`
 * menyimpan 20 terbitan terakhir (yang lama didorong ke depan). `lanjut` adalah saklar tingkat Lanjut (SPEC-V0.2 11.5):
 * mematikannya menyembunyikan CSS kustom dan Blok HTML dari website publik tanpa menghapus kodenya.
 */
export type SitusDesa = {
  desaId: string
  terbit: VersiSitus
  draf: VersiSitus | null
  riwayat: VersiSitus[]
  lanjut: { aktif: boolean; pertamaDiaktifkan: string | null }
}

/** Balasan `PUT /website/situs/lanjut` (7G): keadaan saklar tingkat Lanjut. */
export const lanjutSitusSchema = z.object({ aktif: z.boolean(), pertamaDiaktifkan: z.string().nullable() })
export type LanjutSitus = z.infer<typeof lanjutSitusSchema>

/** GET /website/situs: versi terbit, draf, dan keadaan saklar tingkat Lanjut (7G). */
export const situsSchema = z.object({ terbit: versiSitusSchema, draf: versiSitusSchema.nullable(), lanjut: lanjutSitusSchema })
export type SitusRespons = z.infer<typeof situsSchema>

const penandaGambar = z.literal(true).nullable()

/**
 * Versi di riwayat: gambar data URL (`tema.logo`, `tema.sampul`, `warga.fotoLatar`) diganti penanda `true`/`null`
 * supaya respons ringan.
 */
export const versiRiwayatSchema = versiSitusSchema.extend({
  tema: temaDasarSchema.extend({
    logo: penandaGambar,
    sampul: penandaGambar,
    warga: temaDasarSchema.shape.warga.extend({ fotoLatar: penandaGambar }),
  }),
})
export type VersiRiwayat = z.infer<typeof versiRiwayatSchema>

/** GET /website/situs/riwayat. */
export const riwayatSitusSchema = z.object({ data: z.array(versiRiwayatSchema) })
export type RiwayatSitus = z.infer<typeof riwayatSitusSchema>
