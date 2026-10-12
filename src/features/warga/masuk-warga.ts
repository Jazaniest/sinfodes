import type { QueryClient } from '@tanstack/react-query'
import { kunciWarga } from '@/api/warga'
import { hapusSesi, simpanSesi } from '@/app/sesi'
import type { SesiWarga } from '@/domain/warga/sesi'

/**
 * Sesi warga baru: token disimpan, cache warga sebelumnya dibuang (data warga lain tidak ikut tampil), lalu sesi
 * langsung ditaruh di cache. Sesi panel admin di peramban yang sama tidak disentuh (fokus review 1).
 */
export function pasangSesiWarga(token: string, sesi: SesiWarga, queryClient: QueryClient): void {
  simpanSesi(token, 'warga')
  queryClient.removeQueries({ queryKey: kunciWarga.semua })
  queryClient.setQueryData(kunciWarga.sesi, sesi)
}

/** Keluar dari layanan warga: token dan cache warga dihapus; sesi admin tetap (fokus review 1). */
export function keluarWarga(queryClient: QueryClient): void {
  hapusSesi('warga')
  queryClient.removeQueries({ queryKey: kunciWarga.semua })
}
