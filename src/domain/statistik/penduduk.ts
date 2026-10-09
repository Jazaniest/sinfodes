import { z } from 'zod'
import type { SelCsv } from '../format/csv'
import { hitungUmur } from '../format/tanggal'
import { AGAMA, KTP_EL, PEKERJAAN, PENDIDIKAN, STATUS_PERKAWINAN, type JenisKelamin } from '../penduduk/enum'
import type { FilterPenduduk } from '../penduduk/filter'
import type { Penduduk } from '../penduduk/schema'
import { namaDusun } from '../wilayah/alamat'
import type { Desa, Dusun } from '../wilayah/schema'

/** Kelompok umur 5 tahunan: 0–4 … 70–74, lalu 75+ (SPEC §6.7). */
export const KELOMPOK_UMUR: readonly { label: string; min: number; max: number | null }[] = [
  ...Array.from({ length: 15 }, (_, i) => ({ label: `${i * 5}–${i * 5 + 4}`, min: i * 5, max: i * 5 + 4 })),
  { label: '75+', min: 75, max: null },
]

const jumlah = z.number().int().min(0)

/** Satu batang grafik. `kunci` null: tidak bisa dibuka sebagai daftar (mis. "Pekerjaan lain", "Belum diisi"). */
export const batangSchema = z.object({ kunci: z.string().nullable(), label: z.string(), jumlah })
export type Batang = z.infer<typeof batangSchema>

export const kelompokUmurSchema = z.object({
  label: z.string(), umurMin: jumlah, umurMax: jumlah.nullable(), laki: jumlah, perempuan: jumlah,
})
export type KelompokUmur = z.infer<typeof kelompokUmurSchema>

/** GET /statistik/penduduk (SPEC §6.7). Hanya angka agregat, tanpa data perorangan. */
export const statistikPendudukSchema = z.object({
  /** Nomor dusun yang dipilih; null = seluruh desa. */
  dusun: z.number().int().min(1).nullable(),
  jiwa: jumlah,
  laki: jumlah,
  perempuan: jumlah,
  kk: jumlah,
  piramida: z.array(kelompokUmurSchema),
  /** Kosong bila satu dusun dipilih. */
  perDusun: z.array(batangSchema),
  agama: z.array(batangSchema),
  pendidikan: z.array(batangSchema),
  pekerjaan: z.array(batangSchema),
  perkawinan: z.array(batangSchema),
  ktpEl: z.array(batangSchema),
})
export type StatistikPenduduk = z.infer<typeof statistikPendudukSchema>

export const GRAFIK_BATANG = ['perDusun', 'agama', 'pendidikan', 'pekerjaan', 'perkawinan', 'ktpEl'] as const
export type GrafikBatang = (typeof GRAFIK_BATANG)[number]

export const JUDUL_GRAFIK: Readonly<Record<GrafikBatang, string>> = {
  perDusun: 'Jumlah per dusun',
  agama: 'Agama',
  pendidikan: 'Pendidikan',
  pekerjaan: 'Pekerjaan (10 teratas)',
  perkawinan: 'Status perkawinan',
  ktpEl: 'Kepemilikan KTP-el',
}

export type KonteksStatistik = {
  hariIni: Date
  dusun: readonly Dusun[]
  istilah: Desa['istilahWilayah']
  /** Nomor dusun yang dipilih; null = seluruh desa. */
  dusunTerpilih: number | null
  kk: number
}

const BELUM_DIISI = 'Belum diisi'
const PEKERJAAN_TERATAS = 10

function hitungNilai(nilai: readonly (string | null)[]): Map<string | null, number> {
  const hitung = new Map<string | null, number>()
  for (const n of nilai) hitung.set(n, (hitung.get(n) ?? 0) + 1)
  return hitung
}

/** Jumlah per nilai menurut urutan enum. Nilai berjumlah 0 tidak ditampilkan; nilai kosong jadi "Belum diisi". */
function perNilai(urutan: readonly string[], nilai: readonly (string | null)[]): Batang[] {
  const hitung = hitungNilai(nilai)
  const hasil = urutan.flatMap((u): Batang[] => {
    const j = hitung.get(u)
    return j ? [{ kunci: u, label: u, jumlah: j }] : []
  })
  const kosong = hitung.get(null)
  if (kosong) hasil.push({ kunci: null, label: BELUM_DIISI, jumlah: kosong })
  return hasil
}

/** 10 pekerjaan terbanyak; sisanya digabung "Pekerjaan lain" (SPEC §6.7). "Lainnya" adalah nilai pekerjaan tersendiri. */
function pekerjaanTeratas(nilai: readonly (string | null)[]): Batang[] {
  const hitung = hitungNilai(nilai)
  const kosong = hitung.get(null) ?? 0
  hitung.delete(null)
  const urut = [...hitung].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'id'))
  const hasil: Batang[] = urut.slice(0, PEKERJAAN_TERATAS).map(([k, j]) => ({ kunci: k, label: String(k), jumlah: j }))
  const sisa = urut.slice(PEKERJAAN_TERATAS).reduce((t, [, j]) => t + j, 0)
  if (sisa > 0) hasil.push({ kunci: null, label: 'Pekerjaan lain', jumlah: sisa })
  if (kosong > 0) hasil.push({ kunci: null, label: BELUM_DIISI, jumlah: kosong })
  return hasil
}

/**
 * Statistik penduduk hidup (SPEC §6.7). `penduduk` sudah dibatasi ke dusun terpilih (bila ada). Angka yang sama nanti
 * dipakai halaman Statistik publik, hanya dalam bentuk agregat.
 */
export function hitungStatistik(penduduk: readonly Penduduk[], ctx: KonteksStatistik): StatistikPenduduk {
  const hidup = penduduk.filter((p) => p.statusDasar === 'Hidup')
  const piramida: KelompokUmur[] = KELOMPOK_UMUR.map((k) => ({ label: k.label, umurMin: k.min, umurMax: k.max, laki: 0, perempuan: 0 }))
  for (const p of hidup) {
    const i = Math.min(Math.floor(hitungUmur(p.tanggalLahir, ctx.hariIni).tahun / 5), KELOMPOK_UMUR.length - 1)
    if (p.jenisKelamin === 'L') piramida[i].laki++
    else piramida[i].perempuan++
  }
  const laki = hidup.filter((p) => p.jenisKelamin === 'L').length
  return {
    dusun: ctx.dusunTerpilih,
    jiwa: hidup.length,
    laki,
    perempuan: hidup.length - laki,
    kk: ctx.kk,
    piramida,
    perDusun:
      ctx.dusunTerpilih === null
        ? [...ctx.dusun]
            .sort((a, b) => a.nomor - b.nomor)
            .map((d) => ({ kunci: String(d.nomor), label: namaDusun(d, ctx.istilah), jumlah: hidup.filter((p) => p.dusunId === d.id).length }))
        : [],
    agama: perNilai(AGAMA, hidup.map((p) => p.agama)),
    pendidikan: perNilai(PENDIDIKAN, hidup.map((p) => p.pendidikan)),
    pekerjaan: pekerjaanTeratas(hidup.map((p) => p.pekerjaan)),
    perkawinan: perNilai(STATUS_PERKAWINAN, hidup.map((p) => p.statusPerkawinan)),
    ktpEl: perNilai(KTP_EL, hidup.map((p) => p.ktpEl)),
  }
}

/** Filter daftar penduduk untuk batang yang diklik, mis. agama Islam di Dusun II (SPEC §6.7). */
export function filterBatang(grafik: GrafikBatang, kunci: string, dusun: number | null): Partial<FilterPenduduk> {
  const dasar: Partial<FilterPenduduk> = dusun === null ? {} : { dusun }
  switch (grafik) {
    case 'perDusun':
      return { dusun: Number(kunci) }
    case 'agama':
      return { ...dasar, agama: z.enum(AGAMA).parse(kunci) }
    case 'pendidikan':
      return { ...dasar, pendidikan: z.enum(PENDIDIKAN).parse(kunci) }
    case 'pekerjaan':
      return { ...dasar, pekerjaan: z.enum(PEKERJAAN).parse(kunci) }
    case 'perkawinan':
      return { ...dasar, kawin: z.enum(STATUS_PERKAWINAN).parse(kunci) }
    case 'ktpEl':
      return { ...dasar, ktpEl: z.enum(KTP_EL).parse(kunci) }
  }
}

/** Filter untuk satu sisi piramida: kelompok umur dan jenis kelamin. */
export function filterKelompokUmur(
  k: Pick<KelompokUmur, 'umurMin' | 'umurMax'>,
  jk: JenisKelamin,
  dusun: number | null,
): Partial<FilterPenduduk> {
  return { ...(dusun === null ? {} : { dusun }), jk, umurMin: k.umurMin, ...(k.umurMax === null ? {} : { umurMax: k.umurMax }) }
}

/** Isi "Unduh CSV" di halaman Statistik: ringkasan, lalu semua grafik dalam bentuk tabel. */
export function barisCsvStatistik(s: StatistikPenduduk, judul: string): SelCsv[][] {
  const bagian = (nama: string, batang: readonly Batang[]): SelCsv[][] =>
    batang.length === 0 ? [] : [[], [nama, 'Jumlah'], ...batang.map((b): SelCsv[] => [b.label, b.jumlah])]
  return [
    ['Statistik penduduk', judul],
    ['Jiwa', s.jiwa],
    ['Laki-laki', s.laki],
    ['Perempuan', s.perempuan],
    ['KK', s.kk],
    [],
    ['Kelompok umur', 'Laki-laki', 'Perempuan', 'Jumlah'],
    ...s.piramida.map((k): SelCsv[] => [k.label, k.laki, k.perempuan, k.laki + k.perempuan]),
    ...GRAFIK_BATANG.flatMap((g) => bagian(JUDUL_GRAFIK[g], s[g])),
  ]
}
