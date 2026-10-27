import type { ModulDesa } from '../pengaturan/modul'
import type { StatusDesa } from '../wilayah/schema'
import type { PenggunaSesi, PeranSesi } from './schema'

export const KEMAMPUAN = [
  'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'surat.paraf', 'surat.tandatangani',
  'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'keuangan.sinkron',
  'keuangan.lapor', 'aset.lihat', 'buku.lihat', 'website.kelola', 'pengaturan.kelola', 'pengguna.kelola', 'akses-sinfodes.kelola',
  'siaran.lihat', 'siaran.tindak', 'langganan.lihat', 'langganan.bayar', 'modul.kelola',
] as const
export type Kemampuan = (typeof KEMAMPUAN)[number]

/**
 * SPEC §5.1. Beranda, Peta, Lembaga, Pembangunan, dan Notifikasi terbuka untuk semua peran. `keuangan.lapor`: menandai laporan
 * ke kabupaten sudah dikirim (SPEC-V0.2 §8.3 butir 4), untuk Sekretaris Desa, Kepala Desa, dan Kaur Keuangan. Siaran kabupaten
 * (SPEC-V0.2 §8.4): `siaran.lihat` untuk Operator, Sekdes, dan Kades; `siaran.tindak` (tandai ditindaklanjuti) untuk Sekdes dan Kades.
 * Langganan (SPEC-V0.2 §10): `langganan.lihat` dan `langganan.bayar` hanya untuk Sekdes, Kades, dan Kaur Keuangan.
 * Modul desa (SPEC-V0.2 §12.3): `modul.kelola` hanya untuk Sekdes.
 */
export const HAK_AKSES: Readonly<Record<PeranSesi, ReadonlySet<Kemampuan>>> = {
  operator: new Set<Kemampuan>([
    'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'pengaduan.lihat', 'pengaduan.tanggapi',
    'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat', 'buku.lihat', 'website.kelola', 'pengaturan.kelola',
    'siaran.lihat',
  ]),
  sekdes: new Set<Kemampuan>([
    'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'surat.paraf', 'surat.tandatangani',
    'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat',
    'buku.lihat', 'website.kelola', 'pengaturan.kelola', 'pengguna.kelola', 'akses-sinfodes.kelola', 'keuangan.lapor',
    'siaran.lihat', 'siaran.tindak', 'langganan.lihat', 'langganan.bayar', 'modul.kelola',
  ]),
  // Akses bantuan Sinfodes diberikan pimpinan desa: Sekretaris dan Kepala Desa (SPEC-V0.2 §5.3).
  kades: new Set<Kemampuan>([
    'penduduk.lihat', 'surat.lihat', 'surat.tandatangani', 'pengaduan.lihat', 'bansos.lihat', 'kesehatan.lihat',
    'keuangan.lihat', 'aset.lihat', 'buku.lihat', 'akses-sinfodes.kelola', 'keuangan.lapor', 'siaran.lihat', 'siaran.tindak', 'langganan.lihat', 'langganan.bayar',
  ]),
  'kaur-keuangan': new Set<Kemampuan>(['keuangan.lihat', 'keuangan.sinkron', 'keuangan.lapor', 'aset.lihat', 'buku.lihat', 'langganan.lihat', 'langganan.bayar']),
  kadus: new Set<Kemampuan>([
    'penduduk.lihat', 'surat.lihat', 'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat',
  ]),
  // Sesi bantuan Tim Sinfodes hanya melihat (SPEC-V0.2 §5.3); penulisan juga ditolak di server untuk endpoint apa pun.
  bantuan: new Set<Kemampuan>([
    'penduduk.lihat', 'surat.lihat', 'pengaduan.lihat', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat', 'buku.lihat',
  ]),
}

export function boleh(peran: PeranSesi, kemampuan: Kemampuan): boolean {
  return HAK_AKSES[peran].has(kemampuan)
}

/**
 * Kemampuan yang mengubah data desa. Dicabut dari semua peran selama desa Ditangguhkan (SPEC-V0.2 §10.5, rencana 7D-2 keputusan 9):
 * panel hanya bisa dilihat. Tidak termasuk `langganan.*` dan `akses-sinfodes.kelola`, yang justru dibutuhkan untuk memulihkan desa.
 */
export const KEMAMPUAN_TULIS = [
  'penduduk.ubah', 'surat.proses', 'surat.paraf', 'surat.tandatangani', 'pengaduan.tanggapi', 'keuangan.sinkron', 'keuangan.lapor',
  'website.kelola', 'pengaturan.kelola', 'pengguna.kelola', 'siaran.tindak', 'modul.kelola',
] as const satisfies readonly Kemampuan[]

const TULIS: ReadonlySet<Kemampuan> = new Set<Kemampuan>(KEMAMPUAN_TULIS)

/**
 * Kemampuan peran di desa berstatus tertentu dan bermodul tertentu. Ditangguhkan mencabut kemampuan tulis; modul Kesehatan
 * yang dimatikan mencabut `kesehatan.lihat` (SPEC-V0.2 12.3). Tanpa `modul`, semua modul dianggap menyala.
 */
export function kemampuanEfektif(peran: PeranSesi, status: StatusDesa, modul?: ModulDesa): ReadonlySet<Kemampuan> {
  const dasar = HAK_AKSES[peran]
  if (status !== 'Ditangguhkan' && modul?.kesehatan !== false) return dasar
  return new Set([...dasar].filter((k) => !(status === 'Ditangguhkan' && TULIS.has(k)) && !(modul?.kesehatan === false && k === 'kesehatan.lihat')))
}

/** `boleh` yang memperhitungkan penangguhan dan modul desa. Layar memakainya lewat `useBoleh()`, API tiruan lewat `butuhKemampuan`. */
export function bolehDi(peran: PeranSesi, status: StatusDesa, kemampuan: Kemampuan, modul?: ModulDesa): boolean {
  return kemampuanEfektif(peran, status, modul).has(kemampuan)
}

/** Kepala dusun hanya melihat data dusunnya; peran lain melihat seluruh desa. */
export function cakupanDusun(pengguna: Pick<PenggunaSesi, 'peran' | 'dusunId'>): string | null {
  return pengguna.peran === 'kadus' ? pengguna.dusunId : null
}
