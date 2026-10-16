/** Huruf dan angka kode verifikasi: tanpa O/0/I/1 supaya tidak tertukar saat diketik (SPEC §7.5). */
export const ALFABET_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const POLA_KODE_VERIFIKASI = /^[A-Z]+-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/

/** "SS-7K3M-Q9TD": kode desa + 8 karakter acak dalam dua kelompok, tanpa data pribadi. `acak` memberi [0, 1). */
export function buatKodeVerifikasi(kodeDesa: string, acak: () => number): string {
  const huruf = Array.from({ length: 8 }, () => ALFABET_KODE[Math.floor(acak() * ALFABET_KODE.length)])
  return `${kodeDesa}-${huruf.slice(0, 4).join('')}-${huruf.slice(4).join('')}`
}

/** Alamat website desa yang tercetak di surat (SPEC-V0.2 §4.1): "sungaisialang" → "sungaisialang.sinfodes.com". */
export function domainDesa(label: string, domainInduk: string): string {
  return `${label}.${domainInduk}`
}

/** Isi QR surat: halaman verifikasi di alamat desa (SPEC §7.6, SPEC-V0.2 §4.4). `asal` adalah asal website desa. */
export function tautanVerifikasi(asal: string, kode: string): string {
  return `${asal}/verifikasi?kode=${encodeURIComponent(kode)}`
}
