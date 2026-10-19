import type { PenggunaSesi, PeranSesi } from './schema'

export const KEMAMPUAN = [
  'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'surat.paraf', 'surat.tandatangani',
  'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'keuangan.sinkron',
  'keuangan.lapor', 'aset.lihat', 'buku.lihat', 'website.kelola', 'pengaturan.kelola', 'pengguna.kelola', 'akses-sinfodes.kelola',
] as const
export type Kemampuan = (typeof KEMAMPUAN)[number]

/**
 * SPEC §5.1. Beranda, Peta, Lembaga, Pembangunan, dan Notifikasi terbuka untuk semua peran. `keuangan.lapor`: menandai laporan
 * ke kabupaten sudah dikirim (SPEC-V0.2 §8.3 butir 4), untuk Sekretaris Desa, Kepala Desa, dan Kaur Keuangan.
 */
export const HAK_AKSES: Readonly<Record<PeranSesi, ReadonlySet<Kemampuan>>> = {
  operator: new Set<Kemampuan>([
    'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'pengaduan.lihat', 'pengaduan.tanggapi',
    'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat', 'buku.lihat', 'website.kelola', 'pengaturan.kelola',
  ]),
  sekdes: new Set<Kemampuan>([
    'penduduk.lihat', 'penduduk.ubah', 'surat.lihat', 'surat.proses', 'surat.paraf', 'surat.tandatangani',
    'pengaduan.lihat', 'pengaduan.tanggapi', 'bansos.lihat', 'kesehatan.lihat', 'keuangan.lihat', 'aset.lihat',
    'buku.lihat', 'website.kelola', 'pengaturan.kelola', 'pengguna.kelola', 'akses-sinfodes.kelola', 'keuangan.lapor',
  ]),
  // Akses bantuan Sinfodes diberikan pimpinan desa: Sekretaris dan Kepala Desa (SPEC-V0.2 §5.3).
  kades: new Set<Kemampuan>([
    'penduduk.lihat', 'surat.lihat', 'surat.tandatangani', 'pengaduan.lihat', 'bansos.lihat', 'kesehatan.lihat',
    'keuangan.lihat', 'aset.lihat', 'buku.lihat', 'akses-sinfodes.kelola', 'keuangan.lapor',
  ]),
  'kaur-keuangan': new Set<Kemampuan>(['keuangan.lihat', 'keuangan.sinkron', 'keuangan.lapor', 'aset.lihat', 'buku.lihat']),
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

/** Kepala dusun hanya melihat data dusunnya; peran lain melihat seluruh desa. */
export function cakupanDusun(pengguna: Pick<PenggunaSesi, 'peran' | 'dusunId'>): string | null {
  return pengguna.peran === 'kadus' ? pengguna.dusunId : null
}
