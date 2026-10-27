import { pad2, tahunDariDuaDigit, tanggalValid } from '../format/kalender'

export type HasilNomorKk =
  | { status: 'kosong' }
  | { status: 'tidak-lengkap'; pesan: string }
  | { status: 'tidak-valid'; pesan: string }
  | { status: 'valid'; digit: string; kodeWilayah: string; tanggalTerbit: string; nomorUrut: string }

/** Nomor KK: wilayah (6) · tanggal terbit DDMMYY (6) · nomor urut (4). */
export function periksaNomorKk(masukan: string, hariIni: Date = new Date()): HasilNomorKk {
  const digit = masukan.replace(/\D/g, '').slice(0, 16)
  if (!digit) return { status: 'kosong' }
  if (digit.length < 16) return { status: 'tidak-lengkap', pesan: `Nomor KK harus 16 angka — baru ${digit.length}` }
  const hari = Number(digit.slice(6, 8))
  const bulan = Number(digit.slice(8, 10))
  const tahun = tahunDariDuaDigit(Number(digit.slice(10, 12)), bulan, hari, hariIni)
  if (!tanggalValid(tahun, bulan, hari)) return { status: 'tidak-valid', pesan: 'Tanggal terbit di nomor KK tidak valid' }
  return {
    status: 'valid',
    digit,
    kodeWilayah: digit.slice(0, 6),
    tanggalTerbit: `${tahun}-${pad2(bulan)}-${pad2(hari)}`,
    nomorUrut: digit.slice(12),
  }
}

export function buatNomorKk(p: { kodeWilayah: string; tanggalTerbit: string; nomorUrut: number }): string {
  const [tahun, bulan, hari] = p.tanggalTerbit.split('-').map(Number)
  return `${p.kodeWilayah}${pad2(hari)}${pad2(bulan)}${pad2(tahun % 100)}${String(p.nomorUrut).padStart(4, '0')}`
}
