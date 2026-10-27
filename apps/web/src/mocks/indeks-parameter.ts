import { MUSIM, bulanPeriode, periodeBerjalan, periodeTerakhirTutup, uraiPeriode, type Musim, type Periode } from '@/domain/indeks/periode'
import { bulanAwalIndeks } from '@sinfodes/demo/indeks-dasar'

export const PILIHAN_TIDAK_DIKENAL = 'Pilihan tidak dikenal.'
export const adalah = <T extends string>(daftar: readonly T[], nilai: string | null): nilai is T => nilai !== null && (daftar as readonly string[]).includes(nilai)

/**
 * Parameter `musim` dan `periode` yang dipakai papan kabupaten dan halaman Peringkat desa (SPEC-V0.2 §9.3). Bawaannya musim
 * Bulanan dan periode tutup terakhir; galat per field memakai pesan yang sama di kedua endpoint.
 */
export function uraiMusimPeriode(parameter: URLSearchParams, sekarang: Date): { musim: Musim; periode: Periode; galat: Record<string, string> } {
  const galat: Record<string, string> = {}
  const mentahMusim = parameter.get('musim')
  const musim: Musim = adalah(MUSIM, mentahMusim) ? mentahMusim : 'bulanan'
  if (mentahMusim !== null && !adalah(MUSIM, mentahMusim)) galat.musim = PILIHAN_TIDAK_DIKENAL

  let periode: Periode = periodeTerakhirTutup(musim, sekarang)
  const mentahPeriode = parameter.get('periode')
  if (mentahPeriode !== null) {
    const urai = uraiPeriode(musim, mentahPeriode)
    if (!urai) galat.periode = PILIHAN_TIDAK_DIKENAL
    else if (bulanPeriode(urai)[0] < bulanAwalIndeks(sekarang) || bulanPeriode(urai)[0] > bulanPeriode(periodeBerjalan(musim, sekarang))[0]) galat.periode = 'Periode tidak tersedia.'
    else periode = urai
  }
  return { musim, periode, galat }
}
