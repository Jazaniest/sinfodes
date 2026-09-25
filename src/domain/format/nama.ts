/** Nama pada kolom data surat: KAPITAL, sesuai kebiasaan naskah dinas. */
export function namaUntukSurat(nama: string): string {
  return nama.trim().toLocaleUpperCase('id-ID')
}

/** "Siti Rahmah" → "S*** R*****" untuk halaman verifikasi publik. */
export function samarkanNama(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .map((kata) => kata.charAt(0) + '*'.repeat(Math.max(kata.length - 1, 0)))
    .join(' ')
}

/** "Siti Rahmah" → "SR". */
export function inisialNama(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata.charAt(0).toLocaleUpperCase('id-ID'))
    .join('')
}
