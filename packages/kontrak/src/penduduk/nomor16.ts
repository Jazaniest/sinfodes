/**
 * NIK dan nomor KK seperti yang tampil di respons panel: utuh 16 angka, atau disamarkan di sesi bantuan Tim Sinfodes bila
 * desa memintanya (SPEC-V0.2 §5.3). Masukan formulir tetap wajib 16 angka.
 */
export const POLA_NOMOR16_TAMPIL = /^(\d{16}|\d{4}•{8}\d{4})$/

/** "1405095203918002" → "1405••••••••8002". */
export const samarkanNomor16 = (nomor: string): string => `${nomor.slice(0, 4)}••••••••${nomor.slice(12)}`
