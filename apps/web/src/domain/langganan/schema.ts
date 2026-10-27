import { z } from 'zod'
import { formatRupiah } from '../format/angka'
import { PAKET } from '../konsol/filter'
import { PERIODE_TAGIHAN, tagihanSchema } from './tagihan'

/** Batas berkas bukti transfer (keputusan 7D-1 butir 9). */
export const MAKS_BUKTI_MB = 2
export const MAKS_BUKTI_BAIT = MAKS_BUKTI_MB * 1024 * 1024
export const PESAN_JENIS_BUKTI = 'Bukti harus gambar (PNG, JPG, WebP) atau PDF.'
export const PESAN_UKURAN_BUKTI = `Ukuran bukti maksimal ${MAKS_BUKTI_MB} MB.`
export const PESAN_BUKTI_WAJIB = 'Unggah bukti transfer.'

const TIPE_GAMBAR = ['image/png', 'image/jpeg', 'image/webp'] as const
const TIPE_PDF = 'application/pdf'
const EKSTENSI_GAMBAR = ['.png', '.jpg', '.jpeg', '.webp'] as const

/** Atribut `accept` untuk pemilih berkas. */
export const TERIMA_BUKTI = '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf'

/**
 * Jenis bukti dari tipe berkas, atau dari ekstensi bila tipenya kosong atau tidak dikenal: PDF tanpa ekstensi tetapi bertipe
 * `application/pdf` diterima. null bila bukan gambar PNG, JPG, WebP maupun PDF.
 */
export function jenisBerkasBukti(berkas: { name: string; type: string }): 'gambar' | 'pdf' | null {
  const tipe = berkas.type.toLowerCase()
  if (tipe === TIPE_PDF) return 'pdf'
  if ((TIPE_GAMBAR as readonly string[]).includes(tipe)) return 'gambar'
  const nama = berkas.name.toLowerCase()
  if (nama.endsWith('.pdf')) return 'pdf'
  return EKSTENSI_GAMBAR.some((e) => nama.endsWith(e)) ? 'gambar' : null
}

/** Peringatan, bukan galat: nominal yang berbeda dengan tagihan tetap bisa dikirim (keputusan 7D-1). */
export const peringatanNominal = (diisi: number, tagihan: number): string =>
  `Nominal yang diisi (${formatRupiah(diisi)}) berbeda dengan tagihan (${formatRupiah(tagihan)}). Bukti tetap bisa dikirim; pastikan nominal transfer sudah benar.`

/** Galat berkas bukti (jenis dulu, lalu ukuran), atau null bila sah. */
export function galatBerkasBukti(berkas: { name: string; type: string; size: number }): string | null {
  if (jenisBerkasBukti(berkas) === null) return PESAN_JENIS_BUKTI
  return berkas.size > MAKS_BUKTI_BAIT ? PESAN_UKURAN_BUKTI : null
}

/** GET /langganan: semua yang dibutuhkan halaman Pengaturan › Langganan. `riwayat` memuat semua tagihan desa, terbaru dulu. */
export const langgananDesaSchema = z.object({
  paket: z.enum(PAKET),
  periodeTagihan: z.enum(PERIODE_TAGIHAN),
  masaAktif: z.object({ mulai: z.iso.date(), sampai: z.iso.date() }).nullable(),
  berjalan: tagihanSchema.nullable(),
  riwayat: z.array(tagihanSchema),
})
export type LanggananDesa = z.infer<typeof langgananDesaSchema>

/** GET /langganan/tagihan/:id: tagihan beserta data untuk dokumen cetak. */
export const tagihanCetakSchema = tagihanSchema.extend({
  desa: z.object({ nama: z.string(), kecamatan: z.string(), kabupaten: z.string(), alamatKantor: z.string() }),
  rekening: z.object({ bank: z.string(), nomor: z.string(), atasNama: z.string() }),
})
export type TagihanCetak = z.infer<typeof tagihanCetakSchema>
