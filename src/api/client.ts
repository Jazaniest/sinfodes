import type { z } from 'zod'
import { galatSchema } from '@/domain/api'
import { GalatApi } from './galat'

const BASE = import.meta.env.VITE_API_BASE || '/api/v1'
let tokenSesi: string | null = null

export function aturTokenSesi(token: string | null): void {
  tokenSesi = token
}
export function ambilTokenSesi(): string | null {
  return tokenSesi
}

type Metode = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
type Query = Record<string, string | number | undefined | null>
type Opsi<T> = { skema: z.ZodType<T>; query?: Query; body?: unknown; signal?: AbortSignal }

function buatUrl(jalur: string, query?: Query): URL {
  const asal = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const url = new URL(`${BASE}${jalur}`, asal)
  for (const [kunci, nilai] of Object.entries(query ?? {})) {
    if (nilai !== undefined && nilai !== null && nilai !== '') url.searchParams.set(kunci, String(nilai))
  }
  return url
}

/** Satu pintu untuk semua panggilan API: token, galat seragam (SPEC §3.4), dan validasi skema. */
export async function panggilApi<T>(metode: Metode, jalur: string, opsi: Opsi<T>): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  // FormData (unggah berkas): Content-Type beserta batasnya diisi browser sendiri.
  const formulir = opsi.body instanceof FormData
  if (opsi.body !== undefined && !formulir) headers['Content-Type'] = 'application/json'
  if (tokenSesi) headers.Authorization = `Bearer ${tokenSesi}`

  let respons: Response
  try {
    respons = await fetch(buatUrl(jalur, opsi.query), {
      method: metode,
      headers,
      body: opsi.body === undefined ? undefined : formulir ? (opsi.body as FormData) : JSON.stringify(opsi.body),
      signal: opsi.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new GalatApi('SERVER', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 0)
  }

  if (respons.status === 204) return opsi.skema.parse(undefined)
  const isi: unknown = await respons.json().catch(() => null)
  if (!respons.ok) {
    const galat = galatSchema.safeParse(isi)
    if (galat.success) {
      throw new GalatApi(galat.data.error.code, galat.data.error.message, respons.status, galat.data.error.fields)
    }
    throw new GalatApi('SERVER', 'Server memberi jawaban yang tidak dikenali.', respons.status)
  }
  return opsi.skema.parse(isi)
}
