import { formatTanggal, tanggalIsoWib, waktuIsoWib } from '../format/tanggal'
import { waktuTerakhir, type IsiSusunan } from './penduduk'

/**
 * Bahan Buku Agenda, sama untuk API tiruan dan server (SPEC Lampiran B). `keluar` hanya surat yang sudah terbit (termasuk yang
 * kemudian dibatalkan); `masuk` seluruh register surat masuk desa. Waktu boleh berzona apa pun, disusun menurut WIB.
 */
export type BahanBukuAgenda = {
  keluar: readonly { terbitPada: string; nomor: string; pemohon: string; jenis: string }[]
  masuk: readonly { diterima: string; dicatatPada: string; nomor: string; tanggalSurat: string; pengirim: string; perihal: string }[]
}

const KOLOM_BUKU_AGENDA = ['No', 'Tanggal dicatat', 'Surat', 'Nomor surat', 'Tanggal surat', 'Kepada/Dari', 'Isi singkat'] as const

/** Buku Agenda: surat keluar bernomor dan surat masuk, urut tanggal dicatat lalu waktu catat. */
export function susunBukuAgenda(bahan: BahanBukuAgenda): IsiSusunan {
  const wib = (iso: string) => waktuIsoWib(new Date(iso))
  const keluar = bahan.keluar.map((s) => {
    const waktu = wib(s.terbitPada)
    return { tanggal: tanggalIsoWib(new Date(s.terbitPada)), waktu, isi: ['Keluar', s.nomor, formatTanggal(waktu), s.pemohon, s.jenis] }
  })
  const masuk = bahan.masuk.map((s) => ({
    tanggal: s.diterima, waktu: wib(s.dicatatPada), isi: ['Masuk', s.nomor, formatTanggal(s.tanggalSurat), s.pengirim, s.perihal],
  }))
  // Tanggal dan waktu yang sama (satu detik) diputus oleh isi barisnya, supaya urutan tidak bergantung pada urutan bahan.
  const kunciIsi = (b: { isi: string[] }) => b.isi.join('\u0001')
  const semua = [...keluar, ...masuk].sort(
    (a, b) => a.tanggal.localeCompare(b.tanggal) || a.waktu.localeCompare(b.waktu) || (kunciIsi(a) < kunciIsi(b) ? -1 : kunciIsi(a) > kunciIsi(b) ? 1 : 0),
  )
  return {
    kolom: KOLOM_BUKU_AGENDA,
    baris: semua.map((b, i) => [String(i + 1), formatTanggal(b.tanggal), ...b.isi]),
    diperbarui: waktuTerakhir(semua.map((b) => b.waktu)),
  }
}
