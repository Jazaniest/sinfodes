import type { KodeBuku } from '@/domain/buku/schema'
import { bukuIndukPenduduk, bukuKtpKk, bukuMutasi, bukuPendudukSementara, bukuRekapitulasi } from './penduduk'
import { bukuApbDesa, bukuInventarisHasil, bukuKader, bukuKegiatan, bukuRab, bukuRencanaKerja } from './tata-kelola'
import type { PenyusunBuku } from './tipe'
import { bukuAgenda, bukuAparat, bukuInventaris, bukuTanahKas } from './umum'

/** Buku yang sudah punya sumber data (SPEC Lampiran B). Buku lain diisi manual dan belum bisa dilihat. */
export const PENYUSUN_BUKU: Readonly<Partial<Record<KodeBuku, PenyusunBuku>>> = {
  'inventaris-kekayaan': bukuInventaris,
  'aparat-pemerintah': bukuAparat,
  'tanah-kas-desa': bukuTanahKas,
  agenda: bukuAgenda,
  'induk-penduduk': bukuIndukPenduduk,
  'mutasi-penduduk': bukuMutasi,
  'rekapitulasi-penduduk': bukuRekapitulasi,
  'penduduk-sementara': bukuPendudukSementara,
  'ktp-kk': bukuKtpKk,
  'apb-desa': bukuApbDesa,
  rab: bukuRab,
  'rencana-kerja-pembangunan': bukuRencanaKerja,
  'kegiatan-pembangunan': bukuKegiatan,
  'inventaris-hasil-pembangunan': bukuInventarisHasil,
  'kader-pemberdayaan': bukuKader,
}

export const penyusunUntuk = (kode: string): PenyusunBuku | undefined =>
  (PENYUSUN_BUKU as Readonly<Record<string, PenyusunBuku | undefined>>)[kode]
