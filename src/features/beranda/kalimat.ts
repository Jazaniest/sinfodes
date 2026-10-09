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
    case 'permohonan-menunggu':
      return {
        teks: `${formatAngka(t.jumlah)} permohonan surat menunggu (${t.tertuaHariKerja === 0 ? 'masuk hari ini' : `tertua ${formatAngka(t.tertuaHariKerja)} hari kerja`})`,
        href: '/admin/surat',
      }
    case 'surat-dikembalikan':
      return {
        teks: `${formatAngka(t.jumlah)} surat dikembalikan untuk diperbaiki (${t.ringkas})`,
        href: `/admin/surat/${t.permohonanId}`,
      }
    case 'kelahiran-dilaporkan':
      return {
        teks: `${formatAngka(t.jumlah)} kelahiran dilaporkan warga, belum dicatat`,
        href: `/admin/kependudukan/mutasi/lahir?laporan=${t.laporanId}`,
      }
    case 'laporan-perbaikan':
      return {
        teks: `${formatAngka(t.jumlah)} laporan perbaikan data dari warga`,
        href: `/admin/kependudukan/penduduk/${t.pendudukId}`,
      }
    case 'data-belum-lengkap':
      return {
        teks: `${formatAngka(t.jumlah)} penduduk datanya belum lengkap`,
        href: '/admin/kependudukan/penduduk?preset=data-belum-lengkap',
      }
  }
}
