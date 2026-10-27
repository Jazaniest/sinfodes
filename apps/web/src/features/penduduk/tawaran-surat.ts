import type { Penduduk } from '@/domain/penduduk/schema'
import { hrefBuatSurat } from '../surat/buat/cari-buat'

/** Surat yang ditawarkan di profil setelah mutasi dicatat (SPEC §6.6): kelahiran, kematian, pindah. */
export const TAWARAN_SURAT = ['SKL', 'SKM', 'SPP'] as const
export type TawaranSurat = (typeof TAWARAN_SURAT)[number]

const STATUS_TAWARAN: Readonly<Record<TawaranSurat, Penduduk['statusDasar']>> = { SKL: 'Hidup', SKM: 'Meninggal', SPP: 'Pindah' }

/** `?surat=` di profil penduduk. Nilai lain diabaikan. */
export function bacaTawaranSurat(cari: Record<string, unknown>): { surat?: TawaranSurat } {
  const surat = TAWARAN_SURAT.find((t) => t === cari.surat)
  return surat ? { surat } : {}
}

/**
 * Isi banner tawaran. Bayi dan almarhum menjadi yang diterangkan; pemohonnya disarankan dari mutasi. Pengantar pindah
 * dibuat atas nama orang yang pindah. Tawaran yang tidak cocok dengan status penduduk diabaikan.
 */
export function isiTawaranSurat(
  surat: TawaranSurat,
  penduduk: Pick<Penduduk, 'id' | 'statusDasar'>,
): { judul: string; tombol: string; href: string } | null {
  if (STATUS_TAWARAN[surat] !== penduduk.statusDasar) return null
  switch (surat) {
    case 'SKL':
      return {
        judul: 'Kelahiran sudah dicatat',
        tombol: 'Buat Surat Keterangan Kelahiran',
        href: hrefBuatSurat({ jenis: 'SKL', subjek: penduduk.id, langkah: 2 }),
      }
    case 'SKM':
      return {
        judul: 'Kematian sudah dicatat',
        tombol: 'Buat Surat Keterangan Kematian',
        href: hrefBuatSurat({ jenis: 'SKM', subjek: penduduk.id, langkah: 2 }),
      }
    case 'SPP':
      return {
        judul: 'Kepindahan sudah dicatat',
        tombol: 'Buat Surat Pengantar Pindah',
        href: hrefBuatSurat({ jenis: 'SPP', pemohon: penduduk.id, langkah: 2 }),
      }
  }
}
