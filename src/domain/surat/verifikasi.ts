/** Huruf dan angka kode verifikasi: tanpa O/0/I/1 supaya tidak tertukar saat diketik (SPEC §7.5). */
export const ALFABET_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const POLA_KODE_VERIFIKASI = /^[A-Z]+-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/

/** "SS-7K3M-Q9TD": kode desa + 8 karakter acak dalam dua kelompok, tanpa data pribadi. `acak` memberi [0, 1). */
export function buatKodeVerifikasi(kodeDesa: string, acak: () => number): string {
  const huruf = Array.from({ length: 8 }, () => ALFABET_KODE[Math.floor(acak() * ALFABET_KODE.length)])
  return `${kodeDesa}-${huruf.slice(0, 4).join('')}-${huruf.slice(4).join('')}`
}

/** Domain website desa (SPEC §3.1): "sungai-sialang" → "sungaisialang.desa.id". */
export function domainDesa(slug: string): string {
  return `${slug.replace(/-/g, '')}.desa.id`
}

/** Isi QR surat: halaman verifikasi website desa. Di demo, website desa ada di `/desa/:slug` (SPEC §3.1, §7.6). */
export function tautanVerifikasi(asal: string, slug: string, kode: string): string {
  return `${asal}/desa/${slug}/verifikasi?kode=${encodeURIComponent(kode)}`
}
