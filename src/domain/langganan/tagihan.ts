import { z } from 'zod'
import { angkaRomawi } from '../format/romawi'
import { HARGA_TRIWULAN, PAKET, type Paket } from '../konsol/filter'

const tanggal = z.iso.date()
const waktu = z.iso.datetime({ offset: true })

/** Status tagihan langganan (SPEC-V0.2 §10). "Lewat jatuh tempo" bukan status tersimpan: dihitung dari `jatuhTempo`. */
export const STATUS_TAGIHAN = ['terbit', 'menunggu-verifikasi', 'lunas', 'dibatalkan'] as const
export type StatusTagihan = (typeof STATUS_TAGIHAN)[number]
export const LABEL_STATUS_TAGIHAN: Readonly<Record<StatusTagihan, string>> = {
  terbit: 'Belum dibayar',
  'menunggu-verifikasi': 'Menunggu verifikasi',
  lunas: 'Lunas',
  dibatalkan: 'Dibatalkan',
}
export const LABEL_LEWAT_JATUH_TEMPO = 'Lewat jatuh tempo'

export const PERIODE_TAGIHAN = ['tahunan', 'triwulan'] as const
export type PeriodeTagihan = (typeof PERIODE_TAGIHAN)[number]
export const LABEL_PERIODE_TAGIHAN: Readonly<Record<PeriodeTagihan, string>> = { tahunan: 'Per tahun', triwulan: 'Per triwulan' }

/** Jarak penerbitan sebelum periode mulai, dan jarak jatuh tempo sesudahnya (keputusan 7D-1 butir 1). */
export const HARI_TERBIT_SEBELUM = 14
export const HARI_JATUH_TEMPO_SESUDAH = 14

export const pelakuTagihanSchema = z.object({
  jenis: z.enum(['sistem', 'desa', 'konsol']),
  id: z.string(),
  nama: z.string(),
})
export type PelakuTagihan = z.infer<typeof pelakuTagihanSchema>

export const buktiSchema = z.object({
  berkas: z.string(),
  ukuranKb: z.number().int().min(0),
  jenisBerkas: z.enum(['gambar', 'pdf']),
  /** Hanya gambar yang disimpan sebagai data URL; PDF cukup nama dan ukuran. */
  dataUrl: z.string().nullable(),
  tanggalTransfer: tanggal,
  namaPengirim: z.string(),
  nominalTransfer: z.number().int().positive(),
  nominalCocok: z.boolean(),
  diunggahPada: waktu,
  oleh: pelakuTagihanSchema,
})
export type Bukti = z.infer<typeof buktiSchema>

const alasanOleh = z.object({ alasan: z.string(), pada: waktu, olehNama: z.string() })

export const tagihanSchema = z.object({
  id: z.string(),
  nomor: z.string(),
  desaId: z.string(),
  paket: z.enum(PAKET),
  periode: z.object({ jenis: z.enum(PERIODE_TAGIHAN), mulai: tanggal, sampai: tanggal, label: z.string() }),
  harga: z.number().int().positive(),
  kodeUnik: z.number().int().min(1).max(999),
  /** Harga + kode unik: nominal yang harus ditransfer persis. */
  nominal: z.number().int().positive(),
  terbit: tanggal,
  jatuhTempo: tanggal,
  status: z.enum(STATUS_TAGIHAN),
  metode: z.literal('transfer-manual'),
  /** Diisi gateway pembayaran kelak; null selama transfer manual. */
  referensiPembayaran: z.string().nullable(),
  bukti: buktiSchema.nullable(),
  penolakanTerakhir: alasanOleh.nullable(),
  lunas: z.object({ diterimaPada: tanggal, nominalDiterima: z.number().int().positive(), ditandaiPada: waktu, olehNama: z.string() }).nullable(),
  kwitansi: z.object({ nomor: z.string(), terbitPada: tanggal }).nullable(),
  dibatalkan: alasanOleh.nullable(),
  riwayat: z.array(z.object({ status: z.enum(STATUS_TAGIHAN), pada: waktu, oleh: pelakuTagihanSchema, catatan: z.string().nullable() })),
})
export type Tagihan = z.infer<typeof tagihanSchema>

export const PELAKU_SISTEM: PelakuTagihan = { jenis: 'sistem', id: 'sistem', nama: 'Sinfodes' }

/** Isian unggah bukti. Batas "tidak sesudah hari ini" diperiksa di handler karena butuh waktu sekarang. */
export const isianBuktiSchema = z.object({
  tanggalTransfer: z.iso.date({ error: 'Pilih tanggal transfer.' }),
  namaPengirim: z
    .string({ error: 'Nama rekening pengirim wajib diisi.' })
    .trim()
    .min(1, 'Nama rekening pengirim wajib diisi.')
    .max(80, 'Paling banyak 80 karakter.'),
  nominalTransfer: z.number({ error: 'Isi nominal yang ditransfer.' }).int('Isi nominal yang ditransfer.').positive('Nominal harus lebih dari 0.'),
})
export type IsianBukti = z.infer<typeof isianBuktiSchema>

const HARI_MS = 86_400_000
const tambahHari = (t: string, hari: number): string => new Date(Date.parse(`${t}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)
const awalTriwulan = (tahun: number, urutan: number): string => `${tahun}-${String((urutan - 1) * 3 + 1).padStart(2, '0')}-01`
const akhirTriwulan = (tahun: number, urutan: number): string => tambahHari(urutan === 4 ? `${tahun + 1}-01-01` : awalTriwulan(tahun, urutan + 1), -1)
const urutanTriwulan = (t: string): number => Math.ceil(Number(t.slice(5, 7)) / 3)

export type RentangTagihan = { mulai: string; sampai: string; label: string }

function triwulan(tahun: number, urutan: number): RentangTagihan {
  return { mulai: awalTriwulan(tahun, urutan), sampai: akhirTriwulan(tahun, urutan), label: `Triwulan ${angkaRomawi(urutan)} ${tahun}` }
}
const tahun = (t: number): RentangTagihan => ({ mulai: `${t}-01-01`, sampai: `${t}-12-31`, label: `Tahun ${t}` })

/** Periode kalender yang memuat `tanggal` (YYYY-MM-DD). */
export function periodeTagihanMemuat(jenis: PeriodeTagihan, t: string): RentangTagihan {
  const th = Number(t.slice(0, 4))
  return jenis === 'tahunan' ? tahun(th) : triwulan(th, urutanTriwulan(t))
}

/** Periode kalender pertama yang mulai sesudah `setelah` (mulai harus lebih besar dari tanggal itu). */
export function periodeTagihanBerikut(jenis: PeriodeTagihan, setelah: string): RentangTagihan {
  const th = Number(setelah.slice(0, 4))
  if (jenis === 'tahunan') return tahun(th + 1)
  const urutan = urutanTriwulan(setelah)
  return urutan === 4 ? triwulan(th + 1, 1) : triwulan(th, urutan + 1)
}

/** Tanggal terbit (mulai - 14) dan jatuh tempo (mulai + 14). */
export function jadwalTagihan(periode: Pick<RentangTagihan, 'mulai'>): { terbit: string; jatuhTempo: string } {
  return { terbit: tambahHari(periode.mulai, -HARI_TERBIT_SEBELUM), jatuhTempo: tambahHari(periode.mulai, HARI_JATUH_TEMPO_SESUDAH) }
}

/** Harga tahunan = 4 x harga triwulan. */
export function hargaTagihan(paket: Paket, jenis: PeriodeTagihan): number {
  return HARGA_TRIWULAN[paket] * (jenis === 'tahunan' ? 4 : 1)
}

/** `SFD/2026/T4/001` (triwulan) atau `SFD/2027/TH/001` (tahunan). */
export function nomorTagihan(periode: Pick<RentangTagihan, 'mulai'>, jenis: PeriodeTagihan, nomorDesa: string): string {
  const bagian = jenis === 'tahunan' ? 'TH' : `T${urutanTriwulan(periode.mulai)}`
  return `SFD/${periode.mulai.slice(0, 4)}/${bagian}/${nomorDesa}`
}

export const lewatJatuhTempo = (t: Pick<Tagihan, 'status' | 'jatuhTempo'>, hariIni: string): boolean => t.status === 'terbit' && hariIni > t.jatuhTempo

/** Label akhir untuk layar: "Lewat jatuh tempo" menggantikan "Belum dibayar" sesudah jatuh tempo. */
export function labelStatusTagihan(t: Pick<Tagihan, 'status' | 'jatuhTempo'>, hariIni: string): string {
  return lewatJatuhTempo(t, hariIni) ? LABEL_LEWAT_JATUH_TEMPO : LABEL_STATUS_TAGIHAN[t.status]
}
