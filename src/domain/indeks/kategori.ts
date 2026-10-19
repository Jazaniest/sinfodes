import { formatAngka } from '../format/angka'

/** Urutan tampil. Tujuh pertama berskor dan membentuk Indeks (SPEC-V0.2 §9.2). */
export const KATEGORI_DESA = ['layanan', 'responsif', 'data', 'transparan', 'digital', 'website', 'serapan', 'meningkat', 'umum'] as const
export type KategoriDesa = (typeof KATEGORI_DESA)[number]

export const KATEGORI_SKOR = KATEGORI_DESA.slice(0, 7) as unknown as readonly KategoriSkor[]
export type KategoriSkor = 'layanan' | 'responsif' | 'data' | 'transparan' | 'digital' | 'website' | 'serapan'

export const KATEGORI_KABUPATEN = ['umum', 'merata'] as const
export type KategoriKabupaten = (typeof KATEGORI_KABUPATEN)[number]

export const LABEL_KATEGORI_DESA: Readonly<Record<KategoriDesa, string>> = {
  layanan: 'Layanan Tercepat',
  responsif: 'Paling Responsif',
  data: 'Data Terlengkap',
  transparan: 'Paling Transparan',
  digital: 'Warga Paling Digital',
  website: 'Website Teraktif',
  serapan: 'Serapan Dana Desa',
  meningkat: 'Paling Meningkat',
  umum: 'Juara Umum',
}

export const LABEL_KATEGORI_KABUPATEN: Readonly<Record<KategoriKabupaten, string>> = {
  umum: 'Juara Umum',
  merata: 'Paling Merata',
}

/** Nilai ukuran mentah yang bernilai skor 0 dan 100 (linear, dipotong). */
export const AMBANG_SKOR: Readonly<Record<KategoriSkor, { nol: number; penuh: number }>> = {
  layanan: { nol: 72, penuh: 2 },
  responsif: { nol: 0, penuh: 100 },
  data: { nol: 0, penuh: 100 },
  transparan: { nol: 0, penuh: 100 },
  digital: { nol: 0, penuh: 50 },
  website: { nol: 0, penuh: 100 },
  serapan: { nol: 0, penuh: 100 },
}

/** Pembulatan 1 desimal yang dipakai di seluruh mesin Indeks. */
export const bulat1 = (x: number): number => Math.round((x + Number.EPSILON) * 10) / 10

export function skorDari(k: KategoriSkor, ukuran: number): number {
  const { nol, penuh } = AMBANG_SKOR[k]
  const skor = ((ukuran - nol) / (penuh - nol)) * 100
  return bulat1(Math.min(100, Math.max(0, skor)))
}

export function lebihBaik(k: KategoriDesa | KategoriKabupaten): 'kecil' | 'besar' {
  return k === 'layanan' ? 'kecil' : 'besar'
}

const PERSEN: ReadonlySet<string> = new Set(['data', 'transparan', 'digital', 'website', 'serapan', 'merata'])

export function formatUkuran(k: KategoriDesa | KategoriKabupaten, nilai: number): string {
  const n = bulat1(nilai)
  if (k === 'layanan') return `${formatAngka(n, 1)} jam`
  if (k === 'meningkat') return `${n > 0 ? '+' : ''}${formatAngka(n === 0 ? 0 : n, 1)} poin`
  if (PERSEN.has(k)) return `${formatAngka(n, 1)}%`
  return formatAngka(n, 1)
}

export const TINGKATAN = ['rintisan', 'berkembang', 'maju', 'mandiri'] as const
export type Tingkatan = (typeof TINGKATAN)[number]

export const LABEL_TINGKATAN: Readonly<Record<Tingkatan, string>> = {
  rintisan: 'Rintisan',
  berkembang: 'Berkembang',
  maju: 'Maju',
  mandiri: 'Mandiri Digital',
}

/** Batas memakai Indeks yang sudah dibulatkan 1 desimal. */
export function tingkatanDari(indeks: number): Tingkatan {
  const n = bulat1(indeks)
  if (n < 40) return 'rintisan'
  if (n < 60) return 'berkembang'
  if (n < 80) return 'maju'
  return 'mandiri'
}
