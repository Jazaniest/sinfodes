import type { TipeBerkas } from './periksa'

/**
 * Penyajian isi berkas (rencana 8F3 Ruling 3): tipe tetap hasil periksa (bukan kiriman klien), `nosniff`, dan CSP yang
 * menggantikan CSP global server (`default-src 'none'`) supaya gambar tampil di tab baru tanpa membuka apa pun yang lain.
 */
export const CSP_BERKAS = "default-src 'none'; img-src 'self'; sandbox; frame-ancestors 'none'"
export const PESAN_BERKAS_TIDAK_TERSIMPAN = 'Berkas tidak tersimpan.'
/** Foto KTP atau KK memuat NIK sebagai piksel; penyamaran NIK tidak bisa menutupnya (8F3 Ruling 7). */
export const PESAN_BERKAS_BANTUAN = 'Foto dan pindaian memuat data pribadi warga, jadi tidak bisa dibuka lewat mode bantuan Sinfodes.'

/** Nama berkas aman untuk header: salinan ASCII bersih, ditambah bentuk UTF-8 (RFC 5987) bila namanya berbeda. */
function disposisi(sebaris: boolean, nama: string): string {
  const ascii = nama.replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 100) || 'berkas'
  const dasar = `${sebaris ? 'inline' : 'attachment'}; filename="${ascii}"`
  if (ascii === nama) return dasar
  const utf8 = encodeURIComponent(nama).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${dasar}; filename*=UTF-8''${utf8}`
}

/** Jawaban 200 untuk satu berkas: gambar tampil sebaris, PDF hanya sebagai unduhan. */
export function jawabBerkas(tipe: TipeBerkas, nama: string, bita: Buffer): Response {
  return new Response(new Uint8Array(bita), {
    status: 200,
    headers: {
      'Content-Type': tipe,
      'Content-Length': String(bita.length),
      'Content-Disposition': disposisi(tipe !== 'application/pdf', nama),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': CSP_BERKAS,
      'Cache-Control': 'no-store',
    },
  })
}
