import { z } from 'zod'

export const UKURAN_KERTAS = ['A4', 'F4'] as const
export type UkuranKertas = (typeof UKURAN_KERTAS)[number]
export const HURUF_SURAT = ['Tinos', 'Arimo', 'Plex Serif'] as const
export type HurufSurat = (typeof HURUF_SURAT)[number]
export const UKURAN_HURUF_PT = [11, 11.5, 12, 12.5, 13] as const
export const SPASI_BARIS = [1, 1.15, 1.5] as const
export const POSISI_LAMBANG = ['kiri', 'tengah'] as const
export const GARIS_KOP = ['tunggal', 'ganda', 'tebal-tipis'] as const
export const POSISI_TANDA_TANGAN = ['kanan', 'tengah'] as const
export const UNSUR_TANDA_TANGAN = ['tempat-tanggal', 'jabatan', 'nama', 'nip'] as const
export type UnsurTandaTangan = (typeof UNSUR_TANDA_TANGAN)[number]
/** Unsur yang tidak boleh hilang dari blok tanda tangan. */
export const UNSUR_WAJIB: readonly UnsurTandaTangan[] = ['tempat-tanggal', 'jabatan', 'nama']
export const POSISI_QR = ['kiri-bawah', 'kanan-bawah', 'bawah-tanda-tangan'] as const
export const ID_TATA_LETAK_SIAP = ['standar', 'dua-lambang', 'rata-tengah'] as const
export type IdTataLetakSiap = (typeof ID_TATA_LETAK_SIAP)[number]

export const PESAN_JUMLAH_BARIS = 'Kop paling sedikit 1 baris dan paling banyak 5 baris.'
export const PESAN_PANJANG_BARIS = 'Baris kop paling banyak 80 karakter.'
export const PESAN_MARGIN = 'Margin 10-40 mm.'
export const PESAN_UNSUR_WAJIB = 'Tempat dan tanggal, jabatan, dan nama wajib ada di blok tanda tangan.'

const barisKop = z.string().trim().min(1, 'Baris kop tidak boleh kosong.').max(80, PESAN_PANJANG_BARIS)
const margin = z.number(PESAN_MARGIN).int(PESAN_MARGIN).min(10, PESAN_MARGIN).max(40, PESAN_MARGIN)

/**
 * Tata letak surat (SPEC-V0.2 12.2): satu objek data yang dipakai desa dan pengecualian per jenis. Strict: kunci tambahan,
 * termasuk CSS atau HTML yang diselipkan, ditolak. QR, kode verifikasi, dan nomor surat tidak punya sakelar mati.
 */
export const tataLetakSuratSchema = z.strictObject({
  /** Null bila sudah diubah dari tata letak siap pakai. */
  siap: z.enum(ID_TATA_LETAK_SIAP).nullable(),
  kop: z.strictObject({
    posisiLambang: z.enum(POSISI_LAMBANG),
    jumlahLambang: z.union([z.literal(1), z.literal(2)]),
    baris: z.array(barisKop).min(1, PESAN_JUMLAH_BARIS).max(5, PESAN_JUMLAH_BARIS),
    garis: z.enum(GARIS_KOP),
  }),
  kertas: z.strictObject({
    ukuran: z.enum(UKURAN_KERTAS),
    margin: z.strictObject({ atas: margin, kanan: margin, bawah: margin, kiri: margin }),
  }),
  huruf: z.strictObject({
    keluarga: z.enum(HURUF_SURAT),
    ukuranPt: z.union([z.literal(11), z.literal(11.5), z.literal(12), z.literal(12.5), z.literal(13)]),
    spasi: z.union([z.literal(1), z.literal(1.15), z.literal(1.5)]),
  }),
  tandaTangan: z.strictObject({
    posisi: z.enum(POSISI_TANDA_TANGAN),
    urutan: z
      .array(z.enum(UNSUR_TANDA_TANGAN))
      .refine((u) => UNSUR_WAJIB.every((k) => u.includes(k)), { message: PESAN_UNSUR_WAJIB })
      .refine((u) => new Set(u).size === u.length, { message: 'Unsur blok tanda tangan tidak boleh ganda.' }),
    nip: z.boolean(),
    tempatCap: z.boolean(),
  }),
  qr: z.strictObject({ posisi: z.enum(POSISI_QR) }),
})
export type TataLetakSurat = z.infer<typeof tataLetakSuratSchema>
