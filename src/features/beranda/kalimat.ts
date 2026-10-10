import type { Beranda, Keadaan, Tindakan } from '@/domain/beranda/schema'
import { formatAngka } from '@/domain/format/angka'
import { hrefPermohonan } from '../surat/filter-url'

/**
 * "2.812 jiwa dalam 806 KK · bulan ini 3 lahir, 1 meninggal, 2 datang, 4 pindah · 64 surat terbit dalam 30 hari terakhir,
 * rata-rata selesai 1 hari kerja" (SPEC §5.3). Surat dihitung 30 hari ke belakang supaya awal bulan tidak tampak sepi.
 */
export function kalimatKeadaan(k: Keadaan): string {
  const b = k.bulanIni
  const s = k.surat
  const surat =
    s.terbit30Hari === 0
      ? 'belum ada surat terbit dalam 30 hari terakhir'
      : `${formatAngka(s.terbit30Hari)} surat terbit dalam 30 hari terakhir, rata-rata selesai ` +
        (s.rataSelesaiHariKerja === 0 ? 'di hari yang sama' : `${formatAngka(s.rataSelesaiHariKerja)} hari kerja`)
  return (
    `${formatAngka(k.jiwa)} jiwa dalam ${formatAngka(k.kk)} KK · bulan ini ` +
    `${formatAngka(b.lahir)} lahir, ${formatAngka(b.meninggal)} meninggal, ${formatAngka(b.datang)} datang, ${formatAngka(b.pindah)} pindah` +
    ` · ${surat}`
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

/**
 * Bagian paling atas Beranda Sekdes dan Kades (SPEC §5.3). Paraf dikerjakan di ruang kerja tiap surat, jadi tautannya ke
 * daftar Perlu TTD; tanda tangan dikerjakan di tumpukan.
 */
export function isiSuratSaya(s: NonNullable<Beranda['suratSaya']>): { judul: string; tautan: { teks: string; href: string } | null } {
  if (s.tahap === 'paraf') {
    return {
      judul: `Perlu paraf Anda (${formatAngka(s.jumlah)})`,
      tautan: s.jumlah > 0 ? { teks: 'Lihat surat yang perlu diparaf', href: hrefPermohonan({ status: 'perlu-ttd' }) } : null,
    }
  }
  return {
    judul: `Menunggu tanda tangan Anda (${formatAngka(s.jumlah)})`,
    tautan: s.jumlah > 0 ? { teks: 'Mulai tanda tangani', href: '/admin/surat/tanda-tangan' } : null,
  }
}
