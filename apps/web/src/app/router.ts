import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import type { KonteksAlamat } from '@/domain/alamat/alamat'
import { routeTree } from '@/routeTree.gen'
import { konteksSekarang } from './alamat'
import { parseSearch, stringifySearch } from './cari-url'
import { rewriteAlamat } from './rewrite-alamat'

/**
 * Router aplikasi. Parameter URL memakai `cari-url`: kode wilayah, nomor RT, dan angka tampil tanpa kutip (tahap 6D).
 * Alamat subdomain dipetakan ke rute internal lewat `rewrite` (SPEC-V0.2 §4.5).
 */
export function buatRouter(queryClient: QueryClient, konteks: KonteksAlamat = konteksSekarang()) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
    parseSearch,
    stringifySearch,
    rewrite: rewriteAlamat(konteks),
  })
}
