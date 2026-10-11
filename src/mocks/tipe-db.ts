import type { Aktivitas } from '@/domain/aktivitas/schema'
import type { PenerimaBansos, ProgramBansos } from '@/domain/bansos/schema'
import type { LaporanImpor } from '@/domain/impor/schema'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { Pengukuran, Posyandu, StatusGizi } from '@/domain/kesehatan/schema'
import type { LaporanData } from '@/domain/laporan/schema'
import type { Mutasi } from '@/domain/mutasi/schema'
import type { Notifikasi } from '@/domain/notifikasi/schema'
import type { Pengaduan } from '@/domain/pengaduan/schema'
import type { Riwayat } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { SuratMasuk } from '@/domain/surat/arsip'
import type { JenisSurat } from '@/domain/surat/jenis'
import type { PengaturanSurat } from '@/domain/surat/pengaturan'
import type { Permohonan } from '@/domain/surat/permohonan'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

/** Naikkan setiap kali seed atau struktur data berubah; data lama di IndexedDB otomatis diganti (SPEC §12). */
export const VERSI_DATA = 6

/** Berkas impor yang sudah diperiksa dan menunggu konfirmasi (SPEC §6.8). */
export type SesiImpor = { id: string; desaId: string; olehId: string; laporan: LaporanImpor; selesai: boolean }

/** Riwayat pengukuran satu balita. Statusnya dihitung pembangkit data (SPEC §8); null bila belum pernah diukur. */
export type PengukuranBalita = { pendudukId: string; desaId: string; pengukuran: Pengukuran[]; status: StatusGizi | null }

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
  /** Layanan Surat (SPEC §7, §12.6). */
  jenisSurat: JenisSurat[]
  permohonan: Permohonan[]
  pengaturanSurat: PengaturanSurat[]
  /** Register surat masuk (SPEC §7.4 layar 5). */
  suratMasuk: SuratMasuk[]
  /** Notifikasi per pengguna (SPEC §5.5). */
  notifikasi: Notifikasi[]
  /** Pengaduan warga beserta percakapannya (SPEC §8). */
  pengaduan: Pengaduan[]
  /** Bantuan sosial: program dan keluarga penerimanya (SPEC §8, §12.6). */
  programBansos: ProgramBansos[]
  penerimaBansos: PenerimaBansos[]
  /** Kesehatan: posyandu dan pengukuran balita (SPEC §8, §12.6). */
  posyandu: Posyandu[]
  pengukuranBalita: PengukuranBalita[]
}
