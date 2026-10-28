import { pad2, tahunDariDuaDigit, tanggalValid } from '../format/kalender'
import { tanggalIsoWib } from '../format/tanggal'

/** Tanggal terbit KK dari nomor KK (DDMMYY di digit 7-12); bila tidak masuk akal, hari ini menurut WIB. Dipakai impor (SPEC-V0.2 §6.8). */
export function tanggalTerbitDariNomorKk(nomorKk: string, sekarang: Date): string {
  const [hari, bulan, yy] = [nomorKk.slice(6, 8), nomorKk.slice(8, 10), nomorKk.slice(10, 12)].map(Number)
  const tahun = tahunDariDuaDigit(yy, bulan, hari, sekarang)
  return tanggalValid(tahun, bulan, hari) ? `${tahun}-${pad2(bulan)}-${pad2(hari)}` : tanggalIsoWib(sekarang)
}
