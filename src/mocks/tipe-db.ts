import type { Aktivitas } from '@/domain/aktivitas/schema'
import type { LaporanImpor } from '@/domain/impor/schema'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { LaporanData } from '@/domain/laporan/schema'
import type { Mutasi } from '@/domain/mutasi/schema'
import type { Riwayat } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

/** Naikkan setiap kali seed atau struktur data berubah; data lama di IndexedDB otomatis diganti (SPEC §12). */
export const VERSI_DATA = 3

/** Berkas impor yang sudah diperiksa dan menunggu konfirmasi (SPEC §6.8). */
export type SesiImpor = { id: string; desaId: string; olehId: string; laporan: LaporanImpor; selesai: boolean }

export type DbDemo = {
  versiData: number
  /** Waktu ISO WIB saat data dibangkitkan; semua tanggal dihitung relatif terhadapnya (SPEC §12.7). */
  tanggalAcuan: string
  desa: Desa[]
  dusun: Dusun[]
  pengguna: Pengguna[]
  /** Termasuk mantan penduduk (Meninggal/Pindah); jumlah jiwa dihitung dari yang Hidup. */
  penduduk: Penduduk[]
  keluarga: Keluarga[]
  mutasi: Mutasi[]
  riwayat: Riwayat[]
  aktivitas: Aktivitas[]
  /** Laporan dari warga: perbaikan data dan kelahiran yang belum dicatat (SPEC §5.3, §10). */
  laporanData: LaporanData[]
  impor: SesiImpor[]
}
