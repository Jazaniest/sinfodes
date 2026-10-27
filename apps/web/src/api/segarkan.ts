import type { QueryClient } from '@tanstack/react-query'
import { kunciKeluarga } from './keluarga'
import { kunciMutasi } from './mutasi'
import { kunciPenduduk } from './penduduk'

/**
 * Kunci cache yang ikut basi setiap kali data kependudukan berubah. Mutasi menandai penerima bansos dan mengubah daftar
 * balita; website desa menampilkan angka penduduk di Beranda dan Statistik (alur demo 2).
 */
const KUNCI_TERDAMPAK = [
  kunciPenduduk.semua, kunciKeluarga.semua, kunciMutasi.semua, ['beranda'], ['cari'], ['statistik'], ['laporan-data'], ['bansos'],
  ['kesehatan'], ['publik'],
] as const

/** Setelah data kependudukan berubah: daftar, detail, Beranda, Buku Mutasi, Statistik, laporan warga, dan pencarian dimuat ulang. */
export async function segarkanKependudukan(queryClient: QueryClient): Promise<void> {
  await Promise.all(KUNCI_TERDAMPAK.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/** Setelah permohonan berubah: daftar, jumlah (angka menu), detail, Beranda, pencarian, dan arsip surat keluar dimuat ulang. */
export async function segarkanSurat(queryClient: QueryClient): Promise<void> {
  await Promise.all([['permohonan'], ['beranda'], ['cari'], ['arsip'], ['notifikasi']].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/** Setelah pengaduan dibalas atau statusnya berubah: kotak masuk, jumlah (angka menu), detail, dan Beranda dimuat ulang. */
export async function segarkanPengaduan(queryClient: QueryClient): Promise<void> {
  await Promise.all([['pengaduan'], ['beranda']].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
