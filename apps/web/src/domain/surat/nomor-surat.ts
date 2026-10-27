const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const

/** SPEC §7.2 */
export const FORMAT_NOMOR_BAWAAN = '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}'

export type ModeUrutan = 'per-tahun' | 'per-jenis'
export type NomorTerpakai = { tahun: number; urut: number; jenisKode: string }

export function bulanRomawi(bulan: number): string {
  if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) throw new Error(`Bulan tidak valid: ${bulan}`)
  return ROMAWI[bulan - 1]
}

export function formatNomorSurat(
  format: string,
  nilai: { klasifikasi: string; kodeJenis: string; urut: number; kodeDesa: string; tanggal: string },
): string {
  const [tahun, bulan] = nilai.tanggal.split('-').map(Number)
  const pengganti: Record<string, string> = {
    klasifikasi: nilai.klasifikasi,
    kodeJenis: nilai.kodeJenis,
    urut: String(nilai.urut).padStart(3, '0'),
    kodeDesa: nilai.kodeDesa,
    bulanRomawi: bulanRomawi(bulan),
    tahun: String(tahun),
  }
  return format.replace(/\{(\w+)\}/g, (asli: string, kunci: string) => pengganti[kunci] ?? asli)
}

/**
 * Nomor urut berikutnya. Nomor surat yang dibatalkan tetap ada di `terpakai`,
 * sehingga tidak pernah dipakai ulang (SPEC §7.1).
 */
export function urutBerikutnya(
  terpakai: readonly NomorTerpakai[],
  p: { tahun: number; jenisKode: string; mode: ModeUrutan },
): number {
  return (
    terpakai
      .filter((n) => n.tahun === p.tahun && (p.mode === 'per-tahun' || n.jenisKode === p.jenisKode))
      .reduce((maks, n) => Math.max(maks, n.urut), 0) + 1
  )
}
