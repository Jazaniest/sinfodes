export type Pencatat = {
  info(peristiwa: string, data?: Record<string, unknown>): void
  peringatan(peristiwa: string, data?: Record<string, unknown>): void
  galat(peristiwa: string, data?: Record<string, unknown>): void
}

/** Kunci yang nilainya tidak boleh masuk log (SPEC-V0.3 §10), dibandingkan tanpa huruf besar, garis bawah, dan tanda hubung. */
const KUNCI_TERLARANG = new Set(['nik', 'nomorkk', 'pin', 'katasandi', 'passphrase', 'token', 'telepon', 'cookie', 'authorization', 'setcookie'])
const normal = (kunci: string): string => kunci.toLowerCase().replaceAll('_', '').replaceAll('-', '')
const BATAS_KEDALAMAN = 8

/**
 * Galat kueri Drizzle menaruh nilai parameter di pesannya (baris kedua berawalan "params:"), yang bisa berisi email atau data
 * pribadi lain. Baris parameter dibuang dari pesan dan tumpukan; teks SQL (dengan penanda $1, $2) tetap berguna untuk diagnosis.
 */
const tanpaParameter = (teks: string | undefined): string | undefined => teks?.replace(/\nparams:[^\n]*/g, '\nparams: [disamarkan]')

function bersihkan(nilai: unknown, kedalaman: number, terlihat: WeakSet<object>): unknown {
  if (nilai === null || typeof nilai !== 'object') return typeof nilai === 'bigint' ? nilai.toString() : nilai
  if (nilai instanceof Date) return nilai.toISOString()
  if (Buffer.isBuffer(nilai)) return '[biner]'
  if (terlihat.has(nilai)) return '[melingkar]'
  if (kedalaman >= BATAS_KEDALAMAN) return '[terlalu dalam]'
  terlihat.add(nilai)
  if (nilai instanceof Error) {
    return { nama: nilai.name, pesan: tanpaParameter(nilai.message), tumpukan: tanpaParameter(nilai.stack) }
  }
  if (Array.isArray(nilai)) return nilai.map((x) => bersihkan(x, kedalaman + 1, terlihat))
  const hasil: Record<string, unknown> = {}
  for (const [kunci, isi] of Object.entries(nilai)) {
    hasil[kunci] = KUNCI_TERLARANG.has(normal(kunci)) ? '[disamarkan]' : bersihkan(isi, kedalaman + 1, terlihat)
  }
  return hasil
}

/** Pencatat JSON satu baris per peristiwa. `tulis` menerima baris tanpa pemisah baris (uji menangkapnya, produksi ke stdout). */
export function buatPencatat(tulis: (baris: string) => void, waktu: () => Date): Pencatat {
  const catat = (tingkat: string, peristiwa: string, data: Record<string, unknown> = {}): void => {
    const isi = bersihkan(data, 0, new WeakSet()) as Record<string, unknown>
    tulis(JSON.stringify({ ...isi, tingkat, waktu: waktu().toISOString(), peristiwa }))
  }
  return {
    info: (peristiwa, data) => catat('info', peristiwa, data),
    peringatan: (peristiwa, data) => catat('peringatan', peristiwa, data),
    galat: (peristiwa, data) => catat('galat', peristiwa, data),
  }
}
