import type { Pengguna, Peran } from './schema'

export const KEMAMPUAN = [
  'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'surat.paraf', 'surat.tandatangani',
  'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'keuangan.sinkron',
  'aset.lihat', 'buku.lihat', 'website.kelola', 'pengaturan.kelola', 'pengguna.kelola',
] as const
export type Kemampuan = (typeof KEMAMPUAN)[number]

/** SPEC §5.1. Beranda, Peta, Lembaga, Pembangunan, dan Notifikasi terbuka untuk semua peran. */
export const HAK_AKSES: Readonly<Record<Peran, ReadonlySet<Kemampuan>>> = {
  operator: new Set<Kemampuan>([
    'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'pengaduan.lihat', 'pengaduan.tanggapi',
    'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat', 'buku.lihat', 'website.kelola', 'pengaturan.kelola',
  ]),
  sekdes: new Set<Kemampuan>([
    'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'surat.paraf', 'surat.tandatangani',
    'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat',
    'buku.lihat', 'website.kelola', 'pengaturan.kelola', 'pengguna.kelola',
  ]),
  kades: new Set<Kemampuan>([
    'penduduk.lihat', 'surat.lihat', 'surat.tandatangani', 'pengaduan.lihat', 'bansos.lihat', 'kesehatan.lihat',
    'keuangan.lihat', 'aset.lihat', 'buku.lihat',
  ]),
  'kaur-keuangan': new Set<Kemampuan>(['keuangan.lihat', 'keuangan.sinkron', 'aset.lihat', 'buku.lihat']),
  kadus: new Set<Kemampuan>([
    'penduduk.lihat', 'surat.lihat', 'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat',
  ]),
}

export function boleh(peran: Peran, kemampuan: Kemampuan): boolean {
  return HAK_AKSES[peran].has(kemampuan)
}

/** Kepala dusun hanya melihat data dusunnya; peran lain melihat seluruh desa. */
export function cakupanDusun(pengguna: Pengguna): string | null {
  return pengguna.peran === 'kadus' ? pengguna.dusunId : null
}
