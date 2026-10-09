/** BOM UTF-8: Excel membaca huruf seperti "é" dengan benar. */
export const BOM = '﻿'

export type SelCsv = string | number | null

const AWALAN_RUMUS = /^[=+\-@\t\r]/

function teksSel(nilai: SelCsv): string {
  if (nilai === null) return ''
  if (typeof nilai === 'number') return String(nilai)
  // NIK, nomor KK, RT, dan telepon. Tanpa ini Excel mengubahnya menjadi angka: nol di depan hilang, 16 digit jadi notasi ilmiah.
  if (/^\d+$/.test(nilai) && (nilai.length >= 12 || nilai.startsWith('0'))) return `="${nilai}"`
  // Isian yang diawali = + - @ akan dijalankan Excel sebagai rumus (CSV injection); petik satu membuatnya teks biasa.
  const aman = AWALAN_RUMUS.test(nilai) ? `'${nilai}` : nilai
  return /[";\r\n]/.test(aman) ? `"${aman.replace(/"/g, '""')}"` : aman
}

/** CSV untuk Excel berbahasa Indonesia (SPEC §6.2): pemisah titik koma, BOM UTF-8, akhir baris CRLF. */
export function keCsv(baris: readonly (readonly SelCsv[])[]): string {
  return `${BOM}${baris.map((b) => b.map(teksSel).join(';')).join('\r\n')}\r\n`
}
