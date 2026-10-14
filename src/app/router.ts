import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { parseSearch, stringifySearch } from './cari-url'

/** Router aplikasi. Parameter URL memakai `cari-url`: kode wilayah, nomor RT, dan angka tampil tanpa kutip (tahap 6D). */
export function buatRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
    parseSearch,
    stringifySearch,
  })
}
