import type { QueryClient } from '@tanstack/react-query'
import { kunciKeluarga } from './keluarga'
import { kunciMutasi } from './mutasi'
import { kunciPenduduk } from './penduduk'

/** Kunci cache yang ikut basi setiap kali data kependudukan berubah. */
const KUNCI_TERDAMPAK = [kunciPenduduk.semua, kunciKeluarga.semua, kunciMutasi.semua, ['beranda'], ['cari']] as const

/** Setelah data kependudukan berubah: daftar, detail, ringkasan, Beranda, Buku Mutasi, dan pencarian dimuat ulang. */
export async function segarkanKependudukan(queryClient: QueryClient): Promise<void> {
  await Promise.all(KUNCI_TERDAMPAK.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
