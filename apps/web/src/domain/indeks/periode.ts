import { BULAN, tanggalIsoWib } from '../format/tanggal'

export const MUSIM = ['bulanan', 'triwulan', 'tahunan'] as const
export type Musim = (typeof MUSIM)[number]
export const LABEL_MUSIM: Readonly<Record<Musim, string>> = { bulanan: 'Bulanan', triwulan: 'Triwulan', tahunan: 'Tahunan' }

export type Periode = { musim: Musim; kode: string }

const ROMAWI = ['I', 'II', 'III', 'IV']
const pad2 = (n: number): string => String(n).padStart(2, '0')

/** "2026-12" + 1 → "2027-01". */
export function geserBulan(bulan: string, n: number): string {
  const u = Number(bulan.slice(0, 4)) * 12 + Number(bulan.slice(5, 7)) - 1 + n
  return `${Math.floor(u / 12)}-${pad2((u % 12) + 1)}`
}

export function periodeDari(musim: Musim, bulan: string): Periode {
  const tahun = bulan.slice(0, 4)
  if (musim === 'bulanan') return { musim, kode: bulan }
  if (musim === 'tahunan') return { musim, kode: tahun }
  return { musim, kode: `${tahun}-T${Math.ceil(Number(bulan.slice(5, 7)) / 3)}` }
}

export function uraiPeriode(musim: Musim, kode: string): Periode | null {
  if (musim === 'bulanan') return /^\d{4}-(0[1-9]|1[0-2])$/.test(kode) ? { musim, kode } : null
  if (musim === 'triwulan') return /^\d{4}-T[1-4]$/.test(kode) ? { musim, kode } : null
  return /^\d{4}$/.test(kode) ? { musim, kode } : null
}

/** Bulan "YYYY-MM" dalam periode, terlama dulu. */
export function bulanPeriode(p: Periode): string[] {
  const tahun = p.kode.slice(0, 4)
  if (p.musim === 'bulanan') return [p.kode]
  if (p.musim === 'tahunan') return Array.from({ length: 12 }, (_, i) => `${tahun}-${pad2(i + 1)}`)
  const awal = (Number(p.kode.slice(6)) - 1) * 3
  return [1, 2, 3].map((i) => `${tahun}-${pad2(awal + i)}`)
}

export function labelPeriode(p: Periode): string {
  const tahun = p.kode.slice(0, 4)
  if (p.musim === 'bulanan') return `${BULAN[Number(p.kode.slice(5, 7)) - 1]} ${tahun}`
  if (p.musim === 'tahunan') return `Tahun ${tahun}`
  return `Triwulan ${ROMAWI[Number(p.kode.slice(6)) - 1]} ${tahun}`
}

export function periodeSebelumnya(p: Periode): Periode {
  const awal = bulanPeriode(p)[0]
  return periodeDari(p.musim, geserBulan(awal, -(p.musim === 'bulanan' ? 1 : p.musim === 'triwulan' ? 3 : 12)))
}

/** Waktu ISO WIB tanggal 1 pukul 00.00 sesudah bulan terakhir periode. */
export function tutupPada(p: Periode): string {
  return `${geserBulan(bulanPeriode(p).at(-1)!, 1)}-01T00:00:00+07:00`
}

export function periodeBerjalan(musim: Musim, hariIni: Date): Periode {
  return periodeDari(musim, tanggalIsoWib(hariIni).slice(0, 7))
}

export function periodeTerakhirTutup(musim: Musim, hariIni: Date): Periode {
  return periodeSebelumnya(periodeBerjalan(musim, hariIni))
}

/** Periode yang tersedia, terbaru dulu, termasuk yang berjalan. Awalnya periode yang dimulai pada atau setelah `bulanAwal`. */
export function daftarPeriode(musim: Musim, bulanAwal: string, hariIni: Date): Periode[] {
  const hasil: Periode[] = []
  for (let p = periodeBerjalan(musim, hariIni); bulanPeriode(p)[0] >= bulanAwal; p = periodeSebelumnya(p)) hasil.push(p)
  return hasil
}
