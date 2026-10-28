const MAKS_NAMA = 120
/** Karakter kontrol, penghapus, dan pengecoh arah tulisan (mis. U+202E yang membuat `.exe` tampak seperti `.xlsx`). */
// eslint-disable-next-line no-control-regex
const TERLARANG = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g

/**
 * Nama berkas unggahan sebelum disimpan atau dicatat: hanya nama dasar (jalur gaya Unix dan Windows dibuang), tanpa karakter
 * kontrol, paling banyak 120 karakter dengan ekstensi tetap. Nama masuk ke aktivitas dan jawaban, jadi tidak boleh membawa
 * jalur atau karakter yang menipu pembacanya.
 */
export function bersihkanNamaBerkas(nama: string): string {
  const dasar = nama.replace(TERLARANG, '').split(/[\\/]/).pop()?.trim() ?? ''
  if (dasar === '' || dasar === '.' || dasar === '..') return 'berkas'
  if (dasar.length <= MAKS_NAMA) return dasar
  const titik = dasar.lastIndexOf('.')
  const ekstensi = titik > 0 && dasar.length - titik <= 10 ? dasar.slice(titik) : ''
  return dasar.slice(0, MAKS_NAMA - ekstensi.length) + ekstensi
}
