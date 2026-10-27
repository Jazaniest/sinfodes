import type { KabupatenMitra, PenggunaKabupaten } from '@sinfodes/kontrak/kabupaten/schema'

const RIAU = { kode: '14', nama: 'Riau' }

/** Kabupaten mitra demo (SPEC-V0.2 §13): Pelalawan dan Siak, supaya batas antarkabupaten bisa dicoba. Nomor surat fiktif. */
export const KABUPATEN_MITRA_DEMO: readonly KabupatenMitra[] = [
  {
    kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan', provinsi: RIAU, bergabung: '2026-03-02',
    suratPenunjukan: { nomor: '800/DISKOMINFO/II/2026/017', tanggal: '2026-02-20', berkas: 'surat-penunjukan-pelalawan.pdf', ukuranKb: 312 },
  },
  {
    kode: '14.08', nama: 'Siak', label: 'kab-siak', provinsi: RIAU, bergabung: '2026-08-17',
    suratPenunjukan: { nomor: '800/DPMK/VIII/2026/041', tanggal: '2026-08-10', berkas: 'surat-penunjukan-siak.pdf', ukuranKb: 287 },
  },
]

/**
 * Akun kabupaten demo (SPEC-V0.2 §13), nama fiktif. Peninjau Pelalawan menggantikan akun pemantau Konsol v0.1. Email sengaja
 * bukan domain pemerintah sungguhan.
 */
export const PENGGUNA_KABUPATEN_DEMO: readonly PenggunaKabupaten[] = [
  {
    id: 'kab_fajar', kabupatenKode: '14.05', nama: 'Fajar Ramadhan', jabatan: 'Pranata Komputer, Diskominfo Pelalawan', peran: 'admin',
    email: 'admin.pelalawan@demo.sinfodes.id', aktif: true,
  },
  {
    id: 'kab_rosnani', kabupatenKode: '14.05', nama: 'Hj. Rosnani', jabatan: 'Kepala Dinas PMD Kabupaten Pelalawan', peran: 'peninjau',
    email: 'pmd.pelalawan@demo.sinfodes.id', aktif: true,
  },
  {
    id: 'kab_wahyu', kabupatenKode: '14.08', nama: 'Wahyu Saputra', jabatan: 'Pranata Komputer, Diskominfo Siak', peran: 'admin',
    email: 'admin.siak@demo.sinfodes.id', aktif: true,
  },
]
