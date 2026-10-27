import { delay, HttpResponse, type HttpResponseResolver } from 'msw'
import type { KodeGalat } from '@/domain/api'
import { bungkusBantuan } from './bantuan'
import { bacaModeJaringan, jedaUntuk } from './jaringan'

/** Cocok untuk origin mana pun, jadi berlaku di browser maupun di uji Node. */
export const API = '*/api/v1'

type InfoPermintaan = Parameters<HttpResponseResolver>[0]

export function balasGalat(code: KodeGalat, message: string, status: number, fields?: Record<string, string>): Response {
  return HttpResponse.json({ error: fields ? { code, message, fields } : { code, message } }, { status })
}

/** Respons daftar (SPEC §3.4). `ubah` melengkapi baris pada halaman yang dikirim saja. */
export function balasDaftar<T, U = T>(semua: readonly T[], page: number, pageSize: number, ubah?: (x: T) => U): Response {
  const mulai = (page - 1) * pageSize
  const potongan = semua.slice(mulai, mulai + pageSize)
  return HttpResponse.json({
    data: ubah ? potongan.map(ubah) : potongan,
    meta: { page, pageSize, total: semua.length },
  })
}

/**
 * Menerapkan simulasi jaringan dari toolbar demo ke setiap handler (SPEC §3.6), dan aturan sesi bantuan Tim Sinfodes: tulis
 * ditolak, baca dicatat dan disamarkan (SPEC-V0.2 §5.3).
 */
export function denganJaringan(resolver: (info: InfoPermintaan) => Response | Promise<Response>) {
  return async (info: InfoPermintaan): Promise<Response> => {
    const mode = bacaModeJaringan()
    const jeda = jedaUntuk(mode)
    if (jeda > 0) await delay(jeda)
    if (mode === 'gagal') return balasGalat('SERVER', 'Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.', 503)
    return bungkusBantuan(info.request, async () => resolver(info))
  }
}
