import type { LocationRewrite } from '@tanstack/react-router'
import type { KonteksAlamat } from '@/domain/alamat/alamat'

/**
 * Pemetaan alamat luar ↔ rute internal (SPEC-V0.2 §4.5). Rute v0.1 tetap di tempatnya: di alamat desa, `/kabar` dibaca
 * sebagai `/desa/<label>/kabar`, sedangkan `/admin` dan `/warga` tetap. Pemetaan masuk tidak mengubah jalur yang sudah
 * internal, jadi `router.navigate({ href })` dan tautan yang dibuka di tab baru tetap benar.
 */

/** `/admin` cocok dengan `/admin` dan `/admin/…`, tetapi tidak dengan `/administrasi`. */
const berawalan = (jalur: string, awalan: string) => jalur === awalan || jalur.startsWith(`${awalan}/`)

const tambahAwalan = (awalan: string, jalur: string) => (jalur === '/' ? awalan : `${awalan}${jalur}`)

const buangAwalan = (awalan: string, jalur: string) => (berawalan(jalur, awalan) ? jalur.slice(awalan.length) || '/' : jalur)

export function masukkanJalur(konteks: KonteksAlamat, jalur: string): string {
  switch (konteks.jenis) {
    case 'desa': {
      const dasar = `/desa/${konteks.label}`
      // `/katalog/tema/…` (demo, 7E-2) dibuka di alamat desa karena API hanya melayani website desa lewat alamat desa itu.
      if (['/admin', '/warga', '/katalog/tema', dasar].some((a) => berawalan(jalur, a))) return jalur
      return tambahAwalan(dasar, jalur)
    }
    case 'konsol':
      return berawalan(jalur, '/konsol') ? jalur : tambahAwalan('/konsol', jalur)
    case 'kabupaten':
      return berawalan(jalur, '/kabupaten') ? jalur : tambahAwalan('/kabupaten', jalur)
    case 'induk':
      if (berawalan(jalur, '/admin') || berawalan(jalur, '/warga')) return '/panel-pindah'
      if (['/desa', '/konsol', '/kabupaten'].some((a) => berawalan(jalur, a))) return '/tidak-ada'
      return jalur
    case 'terlarang':
      return '/alamat-tidak-dikenal'
    case 'alihkan-induk':
    case 'luar':
      return jalur
  }
}

export function keluarkanJalur(konteks: KonteksAlamat, jalur: string): string {
  switch (konteks.jenis) {
    case 'desa':
      return buangAwalan(`/desa/${konteks.label}`, jalur)
    case 'konsol':
      return buangAwalan('/konsol', jalur)
    case 'kabupaten':
      return buangAwalan('/kabupaten', jalur)
    default:
      return jalur
  }
}

/** Opsi `rewrite` router; tanpa rewrite untuk host di luar domain induk (uji) dan sebelum pengalihan ke induk. */
export function rewriteAlamat(konteks: KonteksAlamat): LocationRewrite | undefined {
  if (konteks.jenis === 'luar' || konteks.jenis === 'alihkan-induk') return undefined
  return {
    input: ({ url }) => {
      url.pathname = masukkanJalur(konteks, url.pathname)
      return url
    },
    output: ({ url }) => {
      url.pathname = keluarkanJalur(konteks, url.pathname)
      return url
    },
  }
}

/**
 * Href internal → href yang tampil di atribut `<a>` (buka di tab baru, salin tautan). Query dan hash utuh. Tautan ke luar
 * (`https:`, `mailto:`, `tel:`, `//…`) dibiarkan: React Aria memanggil fungsi ini untuk setiap href.
 */
export function hrefPublik(konteks: KonteksAlamat, href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href
  const url = new URL(href, 'http://alamat.invalid')
  return `${keluarkanJalur(konteks, url.pathname)}${url.search}${url.hash}`
}
