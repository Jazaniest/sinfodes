export const pad2 = (n: number): string => String(n).padStart(2, '0')

export function tanggalValid(tahun: number, bulan: number, hari: number): boolean {
  const d = new Date(Date.UTC(tahun, bulan - 1, hari))
  return d.getUTCFullYear() === tahun && d.getUTCMonth() === bulan - 1 && d.getUTCDate() === hari
}

/** Tahun dua digit (NIK/KK): abad 2000 bila tanggalnya tidak melewati hari ini, selain itu abad 1900. */
export function tahunDariDuaDigit(yy: number, bulan: number, hari: number, hariIni: Date): number {
  return Date.UTC(2000 + yy, bulan - 1, hari) <= hariIni.getTime() ? 2000 + yy : 1900 + yy
}
