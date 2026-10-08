import { delay, HttpResponse, type HttpResponseResolver } from 'msw'
import type { KodeGalat } from '@/domain/api'
import { bacaModeJaringan, jedaUntuk } from './jaringan'

/** Cocok untuk origin mana pun, jadi berlaku di browser maupun di uji Node. */
export const API = '*/api/v1'

type InfoPermintaan = Parameters<HttpResponseResolver>[0]

export function balasGalat(code: KodeGalat, message: string, status: number, fields?: Record<string, string>): Response {
  return HttpResponse.json({ error: fields ? { code, message, fields } : { code, message } }, { status })
}

export function balasDaftar<T>(semua: readonly T[], page: number, pageSize: number): Response {
  const mulai = (page - 1) * pageSize
  return HttpResponse.json({ data: semua.slice(mulai, mulai + pageSize), meta: { page, pageSize, total: semua.length } })
}

/** Menerapkan simulasi jaringan dari toolbar demo ke setiap handler (SPEC §3.6). */
export function denganJaringan(resolver: (info: InfoPermintaan) => Response | Promise<Response>) {
  return async (info: InfoPermintaan): Promise<Response> => {
    const mode = bacaModeJaringan()
    const jeda = jedaUntuk(mode)
    if (jeda > 0) await delay(jeda)
    if (mode === 'gagal') return balasGalat('SERVER', 'Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.', 503)
    return resolver(info)
  }
}
