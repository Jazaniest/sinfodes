import type { Keadaan, Tindakan } from '@/domain/beranda/schema'
import { formatAngka } from '@/domain/format/angka'

/** "2.812 jiwa dalam 806 KK · bulan ini 3 lahir, 1 meninggal, 2 datang, 4 pindah" (SPEC §5.3). */
export function kalimatKeadaan(k: Keadaan): string {
  const b = k.bulanIni
  return (
    `${formatAngka(k.jiwa)} jiwa dalam ${formatAngka(k.kk)} KK · bulan ini ` +
    `${formatAngka(b.lahir)} lahir, ${formatAngka(b.meninggal)} meninggal, ${formatAngka(b.datang)} datang, ${formatAngka(b.pindah)} pindah`
  )
}

/** Teks dan tujuan tiap butir "Perlu ditindaklanjuti". */
export function isiTindakan(t: Tindakan): { teks: string; href: string } {
  switch (t.jenis) {
    case 'data-belum-lengkap':
      return {
        teks: `${formatAngka(t.jumlah)} penduduk datanya belum lengkap`,
        href: '/admin/kependudukan/penduduk?preset=data-belum-lengkap',
      }
  }
}
