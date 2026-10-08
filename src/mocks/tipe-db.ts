import type { Keluarga } from '@/domain/keluarga/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

/** Naikkan setiap kali seed atau struktur data berubah; data lama di IndexedDB otomatis diganti (SPEC §12). */
export const VERSI_DATA = 1

export type DbDemo = {
  versiData: number
  /** Waktu ISO WIB saat data dibangkitkan; semua tanggal dihitung relatif terhadapnya (SPEC §12.7). */
  tanggalAcuan: string
  desa: Desa[]
  dusun: Dusun[]
  pengguna: Pengguna[]
  penduduk: Penduduk[]
  keluarga: Keluarga[]
}
