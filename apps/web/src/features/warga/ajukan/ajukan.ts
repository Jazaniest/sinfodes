import { syaratWajib, type JenisSuratWarga } from '@/domain/warga/ajukan'
import type { FotoTerpilih } from '../foto'

export type LangkahAjukan = 'jenis' | 'untuk' | 'isian' | 'lampiran' | 'periksa'

/** Lima langkah Ajukan surat (SPEC §10). */
export const LANGKAH_AJUKAN: readonly { id: LangkahAjukan; judul: string }[] = [
  { id: 'jenis', judul: 'Pilih jenis surat' },
  { id: 'untuk', judul: 'Untuk siapa surat ini?' },
  { id: 'isian', judul: 'Isi keterangan' },
  { id: 'lampiran', judul: 'Lampirkan foto' },
  { id: 'periksa', judul: 'Periksa lalu kirim' },
]

/** Yang disimpan sebagai draf. Foto tidak ikut (fokus review 4). */
export type DrafAjukan = { langkah: LangkahAjukan; jenisId: string | null; untukId: string | null; isian: Record<string, string> }
export const DRAF_KOSONG: DrafAjukan = { langkah: 'jenis', jenisId: null, untukId: null, isian: {} }

/** Draf per warga: warga lain di HP yang sama tidak melihatnya (fokus review 4). */
export const kunciDrafAjukan = (pendudukId: string): string => `warga.ajukan.${pendudukId}`

const teksAtauNull = (x: unknown) => x === null || typeof x === 'string'

export function drafAjukanSah(x: unknown): x is DrafAjukan {
  if (typeof x !== 'object' || x === null) return false
  const d = x as Record<string, unknown>
  return (
    LANGKAH_AJUKAN.some((l) => l.id === d.langkah) &&
    teksAtauNull(d.jenisId) &&
    teksAtauNull(d.untukId) &&
    typeof d.isian === 'object' &&
    d.isian !== null &&
    Object.values(d.isian).every((v) => typeof v === 'string')
  )
}

/** Foto per syarat; hanya di memori, tidak masuk draf. */
export type FotoSyarat = Readonly<Record<string, FotoTerpilih | null>>

/** Syarat wajib yang belum ada fotonya. */
export const syaratBelumDifoto = (jenis: Pick<JenisSuratWarga, 'syarat'>, foto: FotoSyarat): string[] =>
  jenis.syarat.filter((s) => syaratWajib(s) && !foto[s])

/** Bahan Ajukan ulang dari permohonan yang ditolak (SPEC §10). */
export type AwalAjukan = { jenisId: string; untukId: string; isian: Record<string, string>; alasanDitolak: string | null }
