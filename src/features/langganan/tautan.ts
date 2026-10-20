/** Alamat halaman cetak satu tagihan di panel desa. */
export const hrefTagihan = (id: string): string => `/admin/pengaturan/langganan/tagihan/${encodeURIComponent(id)}`

/** Alamat halaman cetak kwitansi satu tagihan lunas di panel desa. */
export const hrefKwitansi = (id: string): string => `/admin/pengaturan/langganan/kwitansi/${encodeURIComponent(id)}`
