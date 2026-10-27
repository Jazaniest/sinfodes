import type { TujuanAlamat } from '@/domain/alamat/alamat'

/** Label v0.1 boleh bertanda hubung ("sungai-sialang"); alias diselesaikan oleh `/alamat` di alamat desa itu. */
const POLA_LABEL = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Alamat v0.1 di alamat induk (SPEC-V0.2 §4.4): `/desa/<slug>/…` pindah ke subdomain desa, `/konsol/…` ke `konsol.`.
 * Query dan hash ikut dibawa, termasuk `?kode=` di tautan verifikasi surat. `/admin` dan `/warga` ditangani router.
 */
export function alihAlamatLama(lokasi: { pathname: string; search: string; hash: string }): { tujuan: TujuanAlamat; jalur: string } | null {
  const ekor = `${lokasi.search}${lokasi.hash}`
  const desa = /^\/desa\/([^/]+)(\/.*)?$/.exec(lokasi.pathname)
  if (desa) return POLA_LABEL.test(desa[1]) ? { tujuan: { jenis: 'desa', label: desa[1] }, jalur: `${desa[2] ?? '/'}${ekor}` } : null
  const konsol = /^\/konsol(\/.*)?$/.exec(lokasi.pathname)
  if (konsol) return { tujuan: { jenis: 'konsol' }, jalur: `${konsol[1] ?? '/'}${ekor}` }
  return null
}
