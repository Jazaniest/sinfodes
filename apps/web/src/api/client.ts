import type { z } from 'zod'
import { galatSchema } from '@/domain/api'
import { GalatApi } from './galat'

const BASE = import.meta.env.VITE_API_BASE || '/api/v1'
/** Panel admin, layanan warga, Konsol, dan dasbor kabupaten punya sesi sendiri; semuanya bisa aktif di satu peramban. */
export type BagianSesi = 'admin' | 'warga' | 'konsol' | 'kabupaten'
/**
 * Penanda lokal "sudah masuk" untuk mode nyata: sesi hidup di cookie `HttpOnly` yang tidak terbaca skrip, jadi yang disimpan
 * di peramban hanya penanda ini (SPEC-V0.3 §8.1). Bukan rahasia dan tidak dikirim sebagai `Authorization`.
 */
export const SESI_KUKI = 'kuki'
/** Hasil masuk dengan `token` pasti berisi: token demo apa adanya, atau penanda `SESI_KUKI` bila server tidak mengirimnya. */
export const denganPenandaKuki = <T extends { token?: string }>(hasil: T): T & { token: string } => ({ ...hasil, token: hasil.token ?? SESI_KUKI })
const tokenSesi: Record<BagianSesi, string | null> = { admin: null, warga: null, konsol: null, kabupaten: null }

export function aturTokenSesi(token: string | null, bagian: BagianSesi = 'admin'): void {
  tokenSesi[bagian] = token
}
export function ambilTokenSesi(bagian: BagianSesi = 'admin'): string | null {
  return tokenSesi[bagian]
}

type Metode = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
type Query = Record<string, string | number | undefined | null>
/**
 * Skema respons, atau fungsi yang memuatnya. Skema berat (blok website, tema) diberikan sebagai fungsi `import()` supaya
 * modulnya tidak ikut JS awal lewat loader rute; fungsi itu baru dipanggil saat respons sudah datang.
 */
export type SumberSkema<T> = z.ZodType<T> | (() => Promise<z.ZodType<T>>)
type Opsi<T> = {
  skema: SumberSkema<T>
  query?: Query
  body?: unknown
  signal?: AbortSignal
  /** Token yang dipakai; bawaannya token panel admin. Endpoint `/warga/…` memakai `'warga'`; website publik `null` (tanpa token). */
  sesi?: BagianSesi | null
}

function buatUrl(jalur: string, query?: Query): URL {
  const asal = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const url = new URL(`${BASE}${jalur}`, asal)
  for (const [kunci, nilai] of Object.entries(query ?? {})) {
    if (nilai !== undefined && nilai !== null && nilai !== '') url.searchParams.set(kunci, String(nilai))
  }
  return url
}

const resolusiSkema = async <T>(skema: SumberSkema<T>): Promise<z.ZodType<T>> => (typeof skema === 'function' ? skema() : skema)

/** Satu pintu untuk semua panggilan API: token, galat seragam (SPEC §3.4), dan validasi skema. */
export async function panggilApi<T>(metode: Metode, jalur: string, opsi: Opsi<T>): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  // FormData (unggah berkas): Content-Type beserta batasnya diisi browser sendiri.
  const formulir = opsi.body instanceof FormData
  if (opsi.body !== undefined && !formulir) headers['Content-Type'] = 'application/json'
  const token = opsi.sesi === null ? null : tokenSesi[opsi.sesi ?? 'admin']
  // Penanda `SESI_KUKI` bukan kredensial: sesi mode nyata dibawa cookie HttpOnly oleh peramban.
  if (token && token !== SESI_KUKI) headers.Authorization = `Bearer ${token}`

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

  if (respons.status === 204) return (await resolusiSkema(opsi.skema)).parse(undefined)
  const isi: unknown = await respons.json().catch(() => null)
  if (!respons.ok) {
    const galat = galatSchema.safeParse(isi)
    if (galat.success) {
      throw new GalatApi(galat.data.error.code, galat.data.error.message, respons.status, galat.data.error.fields)
    }
    throw new GalatApi('SERVER', 'Server memberi jawaban yang tidak dikenali.', respons.status)
  }
  return (await resolusiSkema(opsi.skema)).parse(isi)
}
