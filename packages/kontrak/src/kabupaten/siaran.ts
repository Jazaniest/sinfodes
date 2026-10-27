import { z } from 'zod'
import { formatAngka } from '../format/angka'
import type { SelCsv } from '../format/csv'
import { formatJam, formatTanggal, tanggalIsoWib } from '../format/tanggal'

/** Siaran kabupaten ke desa (SPEC-V0.2 §8.4). Batas isian dan jendela butir Ringkasan (keputusan rencana 7B-3). */
export const MAKS_JUDUL_SIARAN = 120
export const MAKS_ISI_SIARAN = 5000
export const MAKS_LAMPIRAN_SIARAN_MB = 5
export const MAKS_CATATAN_TINDAK_LANJUT = 500
export const JENDELA_PERHATIAN_SIARAN_HARI = 30

const tanggal = z.iso.date()
const waktu = z.iso.datetime({ offset: true })
const jumlah = z.number().int().min(0)

export const JENIS_SASARAN = ['semua', 'kecamatan', 'desa'] as const
export type JenisSasaran = (typeof JENIS_SASARAN)[number]
export const LABEL_JENIS_SASARAN: Readonly<Record<JenisSasaran, string>> = {
  semua: 'Semua desa',
  kecamatan: 'Kecamatan tertentu',
  desa: 'Desa tertentu',
}

/** Sasaran yang dipilih Admin. Yang menerima hanya desa Aktif dan Uji coba di dalamnya, dibekukan saat kirim. */
export const sasaranSiaranSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('semua') }),
  z.object({ jenis: z.literal('kecamatan'), kode: z.array(z.string()).min(1, 'Pilih paling sedikit satu kecamatan.').max(50) }),
  z.object({ jenis: z.literal('desa'), id: z.array(z.string()).min(1, 'Pilih paling sedikit satu desa.').max(500) }),
])
export type SasaranSiaran = z.infer<typeof sasaranSiaranSchema>

/** POST /kabupaten/siaran: JSON `data` di FormData; lampiran (opsional) sebagai berkas `lampiran`. Isi berupa teks biasa. */
export const isianSiaranSchema = z.object({
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(MAKS_JUDUL_SIARAN, 'Paling banyak 120 karakter.'),
  isi: z.string().trim().min(1, 'Isi siaran wajib diisi.').max(MAKS_ISI_SIARAN, 'Paling banyak 5.000 karakter.'),
  tindakLanjut: z.object({ tenggat: z.iso.date('Pilih tanggal tenggat.') }).nullable(),
  sasaran: sasaranSiaranSchema,
})
export type IsianSiaran = z.infer<typeof isianSiaranSchema>

/**
 * Kunci galat isian siaran untuk formulir: `tindakLanjut.tenggat` → `tenggat`, `sasaran.kode` dan `sasaran.id` → `sasaran`.
 * Dipakai server dan peramban, jadi pesan dari keduanya jatuh di isian yang sama.
 */
export function kunciGalatSiaran(fields: Readonly<Record<string, string>>): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields)) {
    const kunci = k.startsWith('tindakLanjut') ? 'tenggat' : k.startsWith('sasaran') ? 'sasaran' : k
    hasil[kunci] ??= v
  }
  return hasil
}

/** Demo hanya menyimpan nama dan ukuran lampiran, seperti surat penunjukan. */
export const lampiranSiaranSchema = z.object({ berkas: z.string().min(1), ukuranKb: z.number().int().min(1) })
export type LampiranSiaran = z.infer<typeof lampiranSiaranSchema>

const tindakLanjutSiaranSchema = z.object({ tenggat: tanggal }).nullable()

export const STATUS_SIARAN_DESA = ['belum-dibaca', 'dibaca', 'ditindaklanjuti'] as const
export type StatusSiaranDesa = (typeof STATUS_SIARAN_DESA)[number]
export const LABEL_STATUS_SIARAN: Readonly<Record<StatusSiaranDesa, string>> = {
  'belum-dibaca': 'Belum dibaca',
  dibaca: 'Dibaca',
  ditindaklanjuti: 'Ditindaklanjuti',
}

/** Status satu desa dari baris bacanya: tanpa baris berarti belum dibuka siapa pun di desa itu. */
export function statusSiaranDesa(baca: { tindakLanjut: unknown } | null | undefined): StatusSiaranDesa {
  if (!baca) return 'belum-dibaca'
  return baca.tindakLanjut ? 'ditindaklanjuti' : 'dibaca'
}

/** Tenggat tindak lanjut sudah lewat (hari ini masih belum lewat) dan desa belum menandai. */
export const lewatTenggatSiaran = (tindakLanjut: { tenggat: string } | null, status: StatusSiaranDesa, hariIni: string): boolean =>
  tindakLanjut !== null && status !== 'ditindaklanjuti' && tindakLanjut.tenggat < hariIni

/** "Belum dibaca · lewat tenggat" */
export const labelStatusSiaran = (status: StatusSiaranDesa, lewat: boolean): string =>
  lewat ? `${LABEL_STATUS_SIARAN[status]} · lewat tenggat` : LABEL_STATUS_SIARAN[status]

/** Sasaran untuk ditampilkan: nama kecamatan atau desa yang dipilih; kosong untuk semua desa. */
export const sasaranRingkasSchema = z.object({ jenis: z.enum(JENIS_SASARAN), nama: z.array(z.string()) })
export type SasaranRingkas = z.infer<typeof sasaranRingkasSchema>

export function kalimatSasaran(s: SasaranRingkas): string {
  if (s.jenis === 'semua') return 'Semua desa'
  const [satu] = s.nama
  if (s.jenis === 'kecamatan') return s.nama.length === 1 ? `Kecamatan ${satu}` : `${formatAngka(s.nama.length)} kecamatan`
  return s.nama.length === 1 ? `Desa ${satu}` : `${formatAngka(s.nama.length)} desa pilihan`
}

/** Satu siaran di dasbor kabupaten. `dibaca` termasuk yang sudah menindaklanjuti. */
export const ringkasSiaranSchema = z.object({
  id: z.string(),
  judul: z.string(),
  dikirimPada: waktu,
  dikirimOleh: z.string(),
  sasaran: sasaranRingkasSchema,
  jumlahDesa: jumlah,
  dibaca: jumlah,
  ditindaklanjuti: jumlah,
  tindakLanjut: tindakLanjutSiaranSchema,
  ditarik: z.object({ pada: waktu, olehNama: z.string() }).nullable(),
})
export type RingkasSiaran = z.infer<typeof ringkasSiaranSchema>

/** GET /kabupaten/siaran: terbaru dulu. */
export const daftarSiaranKabupatenSchema = z.object({ data: z.array(ringkasSiaranSchema) })
export type DaftarSiaranKabupaten = z.infer<typeof daftarSiaranKabupatenSchema>

/** Status satu desa sasaran. Strict: kabupaten menerima status, waktu, dan catatan, bukan isi data desa. */
export const desaSiaranSchema = z.strictObject({
  id: z.string(),
  nama: z.string(),
  kecamatan: z.string(),
  status: z.enum(STATUS_SIARAN_DESA),
  dibacaPada: waktu.nullable(),
  tindakLanjut: z.object({ pada: waktu, catatan: z.string() }).nullable(),
})
export type DesaSiaran = z.infer<typeof desaSiaranSchema>

/** GET /kabupaten/siaran/:id: isi lengkap (juga setelah ditarik) dan status per desa, urut kecamatan lalu nama. */
export const detailSiaranKabupatenSchema = z.object({
  siaran: ringkasSiaranSchema.extend({ isi: z.string(), lampiran: lampiranSiaranSchema.nullable() }),
  desa: z.array(desaSiaranSchema),
})
export type DetailSiaranKabupaten = z.infer<typeof detailSiaranKabupatenSchema>

/** GET /kabupaten/siaran/sasaran: desa yang bisa dipilih (Aktif dan Uji coba), per kecamatan. */
export const sasaranTersediaSchema = z.object({
  kecamatan: z.array(z.object({ kode: z.string(), nama: z.string(), desa: z.array(z.object({ id: z.string(), nama: z.string() })) })),
})
export type SasaranTersedia = z.infer<typeof sasaranTersediaSchema>

/** Satu siaran dilihat dari panel desa: status desa itu sendiri. */
export const butirSiaranDesaSchema = z.object({
  id: z.string(),
  judul: z.string(),
  dikirimPada: waktu,
  tindakLanjut: tindakLanjutSiaranSchema,
  status: z.enum(STATUS_SIARAN_DESA),
  ditarik: z.object({ pada: waktu }).nullable(),
})
export type ButirSiaranDesa = z.infer<typeof butirSiaranDesaSchema>

/** GET /siaran (panel desa). `kabupaten` null bila kabupaten desa itu bukan mitra. */
export const daftarSiaranDesaSchema = z.object({ kabupaten: z.string().nullable(), data: z.array(butirSiaranDesaSchema) })
export type DaftarSiaranDesa = z.infer<typeof daftarSiaranDesaSchema>

/** GET /siaran/:id. Setelah ditarik, isi dan lampiran tidak dikirim lagi ke desa (keputusan rencana 7B-3). */
export const detailSiaranDesaSchema = butirSiaranDesaSchema.extend({
  kabupaten: z.string(),
  isi: z.string().nullable(),
  lampiran: lampiranSiaranSchema.nullable(),
  dibaca: z.object({ pada: waktu, olehNama: z.string() }).nullable(),
  ditindaklanjuti: z.object({ pada: waktu, olehNama: z.string(), catatan: z.string() }).nullable(),
})
export type DetailSiaranDesa = z.infer<typeof detailSiaranDesaSchema>

/** POST /siaran/:id/tindak-lanjut (Kades atau Sekdes). Catatan opsional. */
export const tindakLanjutSchema = z.object({
  catatan: z.string().trim().max(MAKS_CATATAN_TINDAK_LANJUT, 'Paling banyak 500 karakter.'),
})
export type IsianTindakLanjut = z.infer<typeof tindakLanjutSchema>

/** Banyaknya desa penerima untuk sasaran yang sedang dipilih; dipakai kalimat hitungan dan dialog konfirmasi. */
export function jumlahDesaSasaran(tersedia: SasaranTersedia, s: SasaranSiaran): number {
  if (s.jenis === 'semua') return tersedia.kecamatan.reduce((n, k) => n + k.desa.length, 0)
  if (s.jenis === 'kecamatan') return tersedia.kecamatan.filter((k) => s.kode.includes(k.kode)).reduce((n, k) => n + k.desa.length, 0)
  return tersedia.kecamatan.flatMap((k) => k.desa).filter((d) => s.id.includes(d.id)).length
}

/** Keterangan status satu siaran dari sisi desa; tenggat yang lewat ikut disebut. */
export function keteranganSiaranDesa(s: ButirSiaranDesa, hariIni: string): string {
  if (s.ditarik) return 'Ditarik oleh kabupaten'
  if (s.status === 'ditindaklanjuti') return 'Sudah ditindaklanjuti'
  if (s.tindakLanjut) {
    const lewat = lewatTenggatSiaran(s.tindakLanjut, s.status, hariIni)
    return `Perlu tindak lanjut sampai ${formatTanggal(s.tindakLanjut.tenggat)}${lewat ? ' · lewat tenggat' : ''}`
  }
  return labelStatusSiaran(s.status, false)
}

export const KOLOM_CSV_SIARAN = ['Kecamatan', 'Desa', 'Status', 'Dibaca pada', 'Ditindaklanjuti pada', 'Catatan tindak lanjut'] as const

/** "2026-09-21 10.05" (WIB): bisa diurutkan di lembar kerja. */
const waktuCsv = (iso: string | null): string | null => (iso === null ? null : `${tanggalIsoWib(new Date(iso))} ${formatJam(iso)}`)

export function barisCsvSiaran(d: DesaSiaran, tindakLanjut: { tenggat: string } | null, hariIni: string): SelCsv[] {
  return [
    d.kecamatan,
    d.nama,
    labelStatusSiaran(d.status, lewatTenggatSiaran(tindakLanjut, d.status, hariIni)),
    waktuCsv(d.dibacaPada),
    waktuCsv(d.tindakLanjut?.pada ?? null),
    d.tindakLanjut ? d.tindakLanjut.catatan || null : null,
  ]
}
