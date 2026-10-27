import { z } from 'zod'
import type { SelCsv } from '../format/csv'
import { STATUS_DESA, type StatusDesa } from '../wilayah/schema'
import { samarkan, type SelSamar } from './samaran'

/** Kolom Data gabungan (SPEC-V0.2 §8.3 butir 6), berurutan seperti di layar dan CSV. */
export const KOLOM_GABUNGAN = ['laki', 'perempuan', 'jiwa', 'kk', 'u0_4', 'u5_14', 'u15_59', 'u60', 'blt', 'pkh', 'pangan'] as const
export type KolomGabungan = (typeof KOLOM_GABUNGAN)[number]
export const LABEL_KOLOM_GABUNGAN: Readonly<Record<KolomGabungan, string>> = {
  laki: 'Laki-laki',
  perempuan: 'Perempuan',
  jiwa: 'Jumlah',
  kk: 'KK',
  u0_4: '0-4',
  u5_14: '5-14',
  u15_59: '15-59',
  u60: '60+',
  blt: 'BLT-DD',
  pkh: 'PKH',
  pangan: 'Bantuan Pangan',
}

/** Kelompok umur dalam tahun penuh pada hari ini (WIB). `sampai` null berarti ke atas. */
export const KELOMPOK_UMUR = [
  { kunci: 'u0_4', dari: 0, sampai: 4 },
  { kunci: 'u5_14', dari: 5, sampai: 14 },
  { kunci: 'u15_59', dari: 15, sampai: 59 },
  { kunci: 'u60', dari: 60, sampai: null },
] as const satisfies readonly { kunci: KolomGabungan; dari: number; sampai: number | null }[]

/** Penerima bansos dihitung per KK, dicocokkan lewat nama singkat programnya. */
export const PROGRAM_GABUNGAN = [
  { kunci: 'blt', singkat: 'BLT-DD' },
  { kunci: 'pkh', singkat: 'PKH' },
  { kunci: 'pangan', singkat: 'Bantuan Pangan' },
] as const satisfies readonly { kunci: KolomGabungan; singkat: string }[]

/** Angka mentah satu desa; tidak pernah keluar dari API tiruan. */
export type BarisMentah = Record<KolomGabungan, number>

/** Bilangan yang tampak tidak boleh 1-4: angka itu harus sudah disamarkan di server. */
export const selSamarSchema = z.union([
  z
    .number()
    .int()
    .min(0)
    .refine((n) => n === 0 || n >= 5, 'Angka 1-4 harus disamarkan'),
  z.literal('<5'),
  z.literal('*'),
])
const sel = selSamarSchema
export const barisGabunganSchema = z.strictObject({
  laki: sel, perempuan: sel, jiwa: sel, kk: sel, u0_4: sel, u5_14: sel, u15_59: sel, u60: sel, blt: sel, pkh: sel, pangan: sel,
})
export type BarisGabungan = z.infer<typeof barisGabunganSchema>

const kodeNama = z.object({ kode: z.string(), nama: z.string() })

/**
 * GET /kabupaten/data-gabungan (SPEC-V0.2 §8.3 butir 6, §5.1): angka gabungan penduduk dan bansos, tersamar. `baris` null
 * berarti desa (atau kecamatan) belum punya data penduduk.
 */
export const dataGabunganSchema = z.object({
  kabupaten: kodeNama,
  tanggal: z.iso.date(),
  total: barisGabunganSchema.nullable(),
  kecamatan: z.array(
    z.object({
      kecamatan: kodeNama,
      baris: barisGabunganSchema.nullable(),
      desa: z.array(z.strictObject({ id: z.string(), nama: z.string(), status: z.enum(STATUS_DESA), baris: barisGabunganSchema.nullable() })),
    }),
  ),
})
export type DataGabungan = z.infer<typeof dataGabunganSchema>

type Mentah = {
  kecamatan: { kecamatan: { kode: string; nama: string }; desa: { id: string; nama: string; status: StatusDesa; baris: BarisMentah | null }[] }[]
}

const jumlahkan = (daftar: readonly BarisMentah[]): BarisMentah | null =>
  daftar.length === 0
    ? null
    : (Object.fromEntries(KOLOM_GABUNGAN.map((k) => [k, daftar.reduce((n, b) => n + b[k], 0)])) as BarisMentah)

const kolomKe = (k: KolomGabungan) => KOLOM_GABUNGAN.indexOf(k)

/**
 * Jumlahkan per kecamatan dan kabupaten, lalu samarkan semua tingkat sekaligus. Garisnya: per baris, jenis kelamin dan
 * kelompok umur terhadap Jumlah; per kolom, kecamatan terhadap kabupaten dan desa terhadap kecamatannya. KK dan bansos hanya
 * punya garis kolom, karena tidak ada jumlah baris untuk keduanya.
 */
export function samarkanGabungan(mentah: Mentah): Omit<DataGabungan, 'kabupaten' | 'tanggal'> {
  const nilai: number[] = []
  const pasang = (b: BarisMentah | null): number | null => {
    if (!b) return null
    const awal = nilai.length
    for (const k of KOLOM_GABUNGAN) nilai.push(b[k])
    return awal
  }
  const kecamatan = mentah.kecamatan.map((k) => ({
    k,
    jumlah: jumlahkan(k.desa.flatMap((d) => (d.baris ? [d.baris] : []))),
  }))
  const total = jumlahkan(kecamatan.flatMap((k) => (k.jumlah ? [k.jumlah] : [])))
  const iTotal = pasang(total)
  const iKec = kecamatan.map((k) => ({ ...k, i: pasang(k.jumlah), desa: k.k.desa.map((d) => ({ d, i: pasang(d.baris) })) }))

  const garis: number[][] = []
  const entitas = [iTotal, ...iKec.flatMap((k) => [k.i, ...k.desa.map((d) => d.i)])].flatMap((i) => (i === null ? [] : [i]))
  for (const e of entitas) {
    garis.push([e + kolomKe('jiwa'), e + kolomKe('laki'), e + kolomKe('perempuan')])
    garis.push([e + kolomKe('jiwa'), ...KELOMPOK_UMUR.map((u) => e + kolomKe(u.kunci))])
  }
  for (let c = 0; c < KOLOM_GABUNGAN.length; c++) {
    if (iTotal !== null) garis.push([iTotal + c, ...iKec.flatMap((k) => (k.i === null ? [] : [k.i + c]))])
    for (const k of iKec) if (k.i !== null) garis.push([k.i + c, ...k.desa.flatMap((d) => (d.i === null ? [] : [d.i + c]))])
  }

  const hasil = samarkan(nilai, garis)
  const ambil = (i: number | null): BarisGabungan | null =>
    i === null ? null : (Object.fromEntries(KOLOM_GABUNGAN.map((k, c) => [k, hasil[i + c] as SelSamar])) as BarisGabungan)
  return {
    total: ambil(iTotal),
    kecamatan: iKec.map((k) => ({
      kecamatan: k.k.kecamatan,
      baris: ambil(k.i),
      desa: k.desa.map(({ d, i }) => ({ id: d.id, nama: d.nama, status: d.status, baris: ambil(i) })),
    })),
  }
}

export const KOLOM_CSV_GABUNGAN = ['Kecamatan', 'Desa', 'Status', ...KOLOM_GABUNGAN.map((k) => LABEL_KOLOM_GABUNGAN[k])] as const

const selCsv = (b: BarisGabungan | null): SelCsv[] => KOLOM_GABUNGAN.map((k) => b?.[k] ?? null)

/** Isi CSV memakai sel tersamar yang sama dengan layar: baris desa, jumlah per kecamatan, dan jumlah kabupaten. */
export function barisCsvGabungan(d: DataGabungan): SelCsv[][] {
  return [
    [...KOLOM_CSV_GABUNGAN],
    ...d.kecamatan.flatMap((k) => [
      ...k.desa.map((x): SelCsv[] => [k.kecamatan.nama, x.nama, x.status, ...selCsv(x.baris)]),
      [k.kecamatan.nama, 'Jumlah kecamatan', null, ...selCsv(k.baris)],
    ]),
    [`Kabupaten ${d.kabupaten.nama}`, 'Jumlah kabupaten', null, ...selCsv(d.total)],
  ]
}
