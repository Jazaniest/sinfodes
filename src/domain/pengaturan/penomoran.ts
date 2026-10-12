import { z } from 'zod'
import { formatNomorSurat, type ModeUrutan } from '../surat/nomor-surat'

/** Potongan nomor surat (SPEC §7.2). */
export const KEPING_NOMOR = ['klasifikasi', 'kodeJenis', 'urut', 'kodeDesa', 'bulanRomawi', 'tahun'] as const
export type KepingNomor = (typeof KEPING_NOMOR)[number]
export const LABEL_KEPING: Readonly<Record<KepingNomor, string>> = {
  klasifikasi: 'Kode klasifikasi',
  kodeJenis: 'Kode jenis surat',
  urut: 'Nomor urut',
  kodeDesa: 'Kode desa',
  bulanRomawi: 'Bulan (Romawi)',
  tahun: 'Tahun',
}

export const PEMISAH_NOMOR = ['/', '-', '.'] as const
export type PemisahNomor = (typeof PEMISAH_NOMOR)[number]

export type SusunanNomor = { keping: KepingNomor[]; pemisah: PemisahNomor }

const kepingDikenal = (k: string): k is KepingNomor => (KEPING_NOMOR as readonly string[]).includes(k)

export const susunFormat = (keping: readonly KepingNomor[], pemisah: PemisahNomor): string => keping.map((k) => `{${k}}`).join(pemisah)

/** Format tersimpan → potongan dan pemisahnya; null bila format tidak tersusun dari potongan dan satu pemisah. */
export function pecahFormat(format: string): SusunanNomor | null {
  const nama = [...format.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
  if (nama.length === 0 || !nama.every(kepingDikenal)) return null
  const keping = nama.filter(kepingDikenal)
  const sisa = format.replace(/\{\w+\}/g, '')
  const pemisah = PEMISAH_NOMOR.find((p) => p === (sisa[0] ?? '/'))
  if (!pemisah || sisa !== pemisah.repeat(keping.length - 1) || susunFormat(keping, pemisah) !== format) return null
  return { keping, pemisah }
}

/** Format yang bisa menghasilkan nomor kembar ditolak (fokus review 3). Null berarti format boleh dipakai. */
export function periksaFormat(keping: readonly KepingNomor[], urutan: ModeUrutan): string | null {
  if (new Set(keping).size !== keping.length) return 'Setiap potongan hanya boleh dipakai sekali.'
  if (!keping.includes('urut')) return 'Format wajib memuat nomor urut.'
  if (!keping.includes('tahun')) return 'Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.'
  // Kode klasifikasi tidak cukup: beberapa jenis surat berbagi klasifikasi (SKTM dan SKP sama-sama 400).
  if (urutan === 'per-jenis' && !keping.includes('kodeJenis')) {
    return 'Urutan per jenis surat wajib memuat kode jenis surat, supaya nomor antar-jenis tidak kembar.'
  }
  return null
}

const urutan = z.enum(['per-tahun', 'per-jenis'])

/** PUT /pengaturan/penomoran. Kode desa di nomor surat juga diatur di sini. */
export const ubahPenomoranSchema = z
  .object({
    formatNomor: z.string(),
    urutan,
    kodeSurat: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,8}$/, 'Kode desa 1–8 huruf atau angka, mis. SS'),
  })
  .superRefine((p, ctx) => {
    const susunan = pecahFormat(p.formatNomor)
    const pesan = susunan ? periksaFormat(susunan.keping, p.urutan) : 'Format nomor tidak dikenali.'
    if (pesan) ctx.addIssue({ code: 'custom', message: pesan, path: ['formatNomor'] })
  })
export type UbahPenomoran = z.infer<typeof ubahPenomoranSchema>

/** GET/PUT /pengaturan/penomoran. `contoh`: jenis surat yang paling sering terbit dan nomor urut berikutnya untuknya. */
export const penomoranSchema = z.object({
  formatNomor: z.string(),
  urutan,
  kodeSurat: z.string(),
  contoh: z.object({
    jenis: z.string(),
    kode: z.string(),
    klasifikasi: z.string(),
    urutPerTahun: z.number().int().min(1),
    urutPerJenis: z.number().int().min(1),
  }),
})
export type Penomoran = z.infer<typeof penomoranSchema>

/** Nomor berikutnya menurut susunan yang sedang disunting, untuk pratinjau sebelum disimpan (SPEC §7.2). */
export function contohNomor(
  susunan: { formatNomor: string; urutan: ModeUrutan; kodeSurat: string },
  contoh: Penomoran['contoh'],
  tanggal: string,
): string {
  return formatNomorSurat(susunan.formatNomor, {
    klasifikasi: contoh.klasifikasi,
    kodeJenis: contoh.kode,
    urut: susunan.urutan === 'per-tahun' ? contoh.urutPerTahun : contoh.urutPerJenis,
    kodeDesa: susunan.kodeSurat,
    tanggal,
  })
}
