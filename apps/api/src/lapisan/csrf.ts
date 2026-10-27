import type { MiddlewareHandler } from 'hono'
import { GalatApp } from '../galat'
import type { Lingkungan } from '../konfigurasi'
import type { LingkunganApp } from './konteks'

const METODE_UBAH = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
export const PESAN_ASAL_DITOLAK = 'Permintaan ditolak: asal permintaan tidak dikenali.'

/**
 * Perlindungan CSRF untuk cookie sesi (SPEC-V0.3 §8.3): metode yang mengubah data hanya diterima dari asal yang sama.
 * `Sec-Fetch-Site` bila ada harus `same-origin` (`same-site` ditolak: subdomain desa lain bukan asal tepercaya); bila tidak
 * ada, `Origin` harus bersuku Host yang sama. Skema tidak dibandingkan di balik proksi TLS, kecuali staging dan produksi
 * wajib `https`. GET dan HEAD tidak mengubah apa pun dan tidak diperiksa.
 */
export function lapisanCsrf(deps: { lingkungan: Lingkungan }): MiddlewareHandler<LingkunganApp> {
  const ketat = deps.lingkungan === 'staging' || deps.lingkungan === 'produksi'
  return async (c, next) => {
    if (METODE_UBAH.has(c.req.method)) {
      const situs = c.req.header('Sec-Fetch-Site')
      const asal = c.req.header('Origin')
      let sama = false
      if (asal) {
        try {
          const o = new URL(asal)
          sama = o.host === new URL(c.req.url).host && (!ketat || o.protocol === 'https:')
        } catch {
          sama = false
        }
      }
      const sah = situs ? situs === 'same-origin' && (asal === undefined || sama) : sama
      if (!sah) throw new GalatApp('FORBIDDEN', PESAN_ASAL_DITOLAK, 403)
    }
    await next()
  }
}
