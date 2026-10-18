import { HttpResponse, type JsonBodyType } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { samarkanNomor16 } from '@/domain/penduduk/nomor16'
import { ambilDb, ubahDb } from './db'
import type { AksesBantuan, DbDemo, SesiBantuan } from './tipe-db'

/**
 * Sesi bantuan Tim Sinfodes di panel desa (SPEC-V0.2 §5.3): lihat saja, setiap GET tercatat, dan NIK serta nomor KK disamarkan
 * bila desa memintanya. Penolakan tulis dipusatkan di `denganJaringan`, jadi berlaku juga untuk endpoint yang ditambahkan kelak.
 */
export const PESAN_LIHAT_SAJA = 'Mode bantuan Sinfodes hanya bisa melihat.'
export const PESAN_TIKET_TIDAK_BERLAKU = 'Tiket bantuan tidak berlaku. Minta ulang dari Konsol.'
/** Tiket dari Konsol harus ditukar dalam waktu ini, dan hanya sekali. */
export const UMUR_TIKET_MS = 60_000

export const tokenBantuanUntuk = (sesiId: string): string => `bantuan.${sesiId}`

/** Akses yang belum dicabut dan belum habis waktunya. */
export const masihBerlaku = (a: AksesBantuan, sekarang: Date): boolean =>
  a.dicabut === null && new Date(a.sampai).getTime() > sekarang.getTime()

export function sesiIdDariPermintaan(request: Request): string | null {
  return /^Bearer bantuan\.(.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1] ?? null
}

export function cariSesiBantuan(db: DbDemo, sesiId: string): { akses: AksesBantuan; sesi: SesiBantuan } | null {
  for (const akses of db.aksesBantuan) {
    const sesi = akses.sesi.find((s) => s.id === sesiId)
    if (sesi) return { akses, sesi }
  }
  return null
}

const KUNCI_PRIBADI = /nik|kk/i
const NOMOR16 = /^\d{16}$/

function samarkan(nilai: unknown, pribadi: boolean): unknown {
  if (typeof nilai === 'string') return pribadi && NOMOR16.test(nilai) ? samarkanNomor16(nilai) : nilai
  if (Array.isArray(nilai)) return nilai.map((x) => samarkan(x, pribadi))
  if (nilai !== null && typeof nilai === 'object') {
    return Object.fromEntries(Object.entries(nilai).map(([k, v]) => [k, samarkan(v, KUNCI_PRIBADI.test(k))]))
  }
  return nilai
}

/** Samarkan setiap string 16 angka di bawah kunci NIK atau nomor KK (mis. `nik`, `nomorKk`), sampai ke data bersarang. */
export const samarkanDataPribadi = (nilai: unknown): unknown => samarkan(nilai, false)

const jalurApi = (url: URL): string => url.pathname.replace(/^.*?\/api\/v1/, '')

/** Dipanggil `denganJaringan` di sekeliling setiap handler. Permintaan tanpa token bantuan diteruskan apa adanya. */
export async function bungkusBantuan(request: Request, jalankan: () => Promise<Response>): Promise<Response> {
  const sesiId = sesiIdDariPermintaan(request)
  if (sesiId === null) return jalankan()
  const url = new URL(request.url)
  const jalur = jalurApi(url)
  if (request.method !== 'GET') {
    if (request.method === 'POST' && jalur === '/sesi/keluar') return jalankan()
    return HttpResponse.json({ error: { code: 'FORBIDDEN', message: PESAN_LIHAT_SAJA } }, { status: 403 })
  }
  const respons = await jalankan()
  const sekarang = new Date()
  const temu = cariSesiBantuan(ambilDb(), sesiId)
  // Token yang tidak berlaku sudah dijawab 401 oleh handler; tidak ada yang dicatat atau disamarkan.
  if (!temu || !masihBerlaku(temu.akses, sekarang) || !respons.ok) return respons
  // GET /sesi hanya pemeriksaan sesi oleh aplikasi, bukan halaman yang dibuka.
  if (jalur !== '/sesi') {
    ubahDb((d) => {
      cariSesiBantuan(d, sesiId)?.sesi.halaman.push({ jalur: `${jalur}${url.search}`, waktu: waktuIsoWib(sekarang) })
    })
  }
  if (!temu.akses.sembunyikanDataPribadi || !(respons.headers.get('Content-Type') ?? '').includes('json')) return respons
  return HttpResponse.json(samarkanDataPribadi(await respons.json()) as JsonBodyType, { status: respons.status })
}
