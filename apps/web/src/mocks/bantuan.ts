import { HttpResponse, type JsonBodyType } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { samarkanNomor16 } from '@/domain/penduduk/nomor16'
import { ambilDb, ubahDb } from './db'
import type { AksesBantuan, DbDemo, SesiBantuan } from '@sinfodes/demo/tipe-db'

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

/** Pencarian memakai POST supaya NIK tidak masuk URL; isinya hanya membaca, jadi boleh di sesi bantuan. */
const JALUR_CARI: ReadonlySet<string> = new Set(['/cari', '/penduduk/cari', '/keluarga/cari', '/permohonan/cari'])
export const PESAN_CARI_NOMOR =
  'Pencarian dengan angka NIK atau nomor KK tidak tersedia selama data pribadi warga disamarkan.'
/** Lima angka berurutan cukup untuk menebak bagian NIK atau nomor KK dari hasil yang cocok. */
const ANGKA_NOMOR = /\d{5}/

async function kataCari(request: Request): Promise<string> {
  const isi: unknown = await request.clone().json().catch(() => null)
  return isi !== null && typeof isi === 'object' && 'kata' in isi && typeof isi.kata === 'string' ? isi.kata : ''
}

const tolak = (pesan: string) => HttpResponse.json({ error: { code: 'FORBIDDEN', message: pesan } }, { status: 403 })

/** Dipanggil `denganJaringan` di sekeliling setiap handler. Permintaan tanpa token bantuan diteruskan apa adanya. */
export async function bungkusBantuan(request: Request, jalankan: () => Promise<Response>): Promise<Response> {
  const sesiId = sesiIdDariPermintaan(request)
  if (sesiId === null) return jalankan()
  const url = new URL(request.url)
  const jalur = jalurApi(url)
  const cari = request.method === 'POST' && JALUR_CARI.has(jalur)
  if (request.method !== 'GET' && !cari) {
    if (request.method === 'POST' && jalur === '/sesi/keluar') return jalankan()
    return tolak(PESAN_LIHAT_SAJA)
  }
  const sekarang = new Date()
  // Selama NIK disamarkan, mencocokkan angka NIK atau KK sama saja dengan membukanya sedikit demi sedikit.
  const awal = cariSesiBantuan(ambilDb(), sesiId)
  if (cari && awal?.akses.sembunyikanDataPribadi && ANGKA_NOMOR.test(await kataCari(request))) return tolak(PESAN_CARI_NOMOR)
  const respons = await jalankan()
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
