import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Klien } from './basisdata/klien'
import { badanGalat, GalatApp, kodeDariStatus } from './galat'
import type { Konfigurasi } from './konfigurasi'
import type { Penyandi } from './kripto/penyandi'
import { lapisanAlamat } from './lapisan/alamat'
import { buatBatasLaju, ipSoket } from './lapisan/batas-laju'
import { lapisanCsrf } from './lapisan/csrf'
import type { LingkunganApp } from './lapisan/konteks'
import { lapisanSesi } from './lapisan/sesi'
import { lapisanTransaksi } from './lapisan/transaksi'
import type { Pencatat } from './log'
import { ruteAlamat } from './modul/alamat/rute'
import { ruteKabupaten } from './modul/kabupaten/rute'
import { ruteKonsol } from './modul/konsol/rute'
import { rutePenduduk } from './modul/penduduk/rute'
import { ruteSesi } from './modul/sesi/rute'
import { ruteWarga } from './modul/warga/rute'
import type { Waktu } from './waktu'

export type DepsApp = {
  konfigurasi: Konfigurasi
  log: Pencatat
  waktu: Waktu
  klien: Klien
  penyandi: Penyandi
  /** Alamat IP klien untuk batas laju; bawaan: alamat soket. Uji menyuntik sendiri. */
  ipKlien?: (c: Context) => string
}

/** Batas badan permintaan untuk /api/v1; rute yang butuh lebih (unggahan) menyetel batasnya sendiri. */
export const BATAS_BADAN_BAWAAN = 1024 * 1024
/** HSTS dimulai pendek lalu dinaikkan menjelang peluncuran (SPEC-V0.3 §15.2). */
const HSTS = 'max-age=300'

export function buatApp(deps: DepsApp): Hono<LingkunganApp> {
  const { konfigurasi, log, waktu, klien, penyandi } = deps
  const app = new Hono<LingkunganApp>()

  // 1. ID permintaan buatan server (ID dari klien diabaikan supaya log tidak bisa disuntik).
  app.use('*', async (c, next) => {
    const id = crypto.randomUUID()
    c.set('idPermintaan', id)
    c.set('waktu', waktu)
    await next()
    c.res.headers.set('X-Request-Id', id)
  })

  // Log satu baris per permintaan: metode, path tanpa query, status, durasi.
  app.use('*', async (c, next) => {
    const mulai = waktu().getTime()
    await next()
    const url = new URL(c.req.url)
    log.info('permintaan', {
      idPermintaan: c.get('idPermintaan'),
      metode: c.req.method,
      path: url.pathname,
      status: c.res.status,
      durasiMs: waktu().getTime() - mulai,
    })
  })

  // Header keamanan untuk jawaban API (SPEC-V0.3 §15.1). CSP halaman web milik proksi (8K).
  app.use('*', async (c, next) => {
    await next()
    const h = c.res.headers
    h.set('X-Content-Type-Options', 'nosniff')
    h.set('Referrer-Policy', 'no-referrer')
    h.set('Cross-Origin-Resource-Policy', 'same-origin')
    h.set('Cross-Origin-Opener-Policy', 'same-origin')
    h.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (new URL(c.req.url).pathname.startsWith('/api/v1')) h.set('Cache-Control', 'no-store')
    const aman = konfigurasi.lingkungan === 'produksi' || konfigurasi.lingkungan === 'staging' || new URL(c.req.url).protocol === 'https:'
    if (aman) h.set('Strict-Transport-Security', HSTS)
  })

  app.use(
    '/api/v1/*',
    bodyLimit({
      maxSize: BATAS_BADAN_BAWAAN,
      onError: (c) => c.json(badanGalat('VALIDATION', 'Isi permintaan terlalu besar.'), 413),
    }),
  )

  // Lapisan SPEC-V0.3 §6.2. CSRF diletakkan sebelum transaksi: permintaan lintas asal ditolak tanpa menyentuh basis data.
  app.use(
    '/api/v1/*',
    lapisanAlamat({ klien, domainInduk: konfigurasi.domainInduk, waktu }),
    lapisanCsrf({ lingkungan: konfigurasi.lingkungan }),
    lapisanTransaksi({ klien }),
    lapisanSesi({ cookieAwalan: konfigurasi.cookieAwalan, waktu }),
  )

  // Batas laju masuk per IP di memori (SPEC-V0.3 §8.5); kunci per akun disimpan di PostgreSQL (`sesi/kunci-masuk.ts`).
  const batasIp = buatBatasLaju({ maks: 5, jendelaMs: 60_000, waktu })
  const batasLupaPin = buatBatasLaju({ maks: 5, jendelaMs: 60_000, waktu })
  const ipKlien = deps.ipKlien ?? ipSoket
  app.route('/api/v1/alamat', ruteAlamat())
  app.route('/api/v1/sesi', ruteSesi({ konfigurasi, penyandi, batasIp, ipKlien }))
  app.route('/api/v1/kabupaten', ruteKabupaten({ konfigurasi, penyandi, batasIp, ipKlien }))
  app.route('/api/v1/konsol', ruteKonsol({ konfigurasi, penyandi, batasIp, ipKlien }))
  app.route('/api/v1/warga', ruteWarga({ konfigurasi, penyandi, batasIp, batasLupaPin, ipKlien }))
  app.route('/api/v1/penduduk', rutePenduduk({ penyandi }))

  app.get('/sehat', (c) => c.json({ hidup: true }))

  app.notFound((c) => c.json(badanGalat('NOT_FOUND', 'Sumber daya tidak ditemukan.'), 404))

  app.onError((galat, c) => {
    if (galat instanceof GalatApp) {
      if (galat.kode === 'RATE_LIMITED') c.header('Retry-After', '60')
      return c.json(badanGalat(galat.kode, galat.message, galat.fields), galat.status as ContentfulStatusCode)
    }
    if (galat instanceof HTTPException && galat.status < 500) {
      return c.json(badanGalat(kodeDariStatus(galat.status), galat.message || 'Permintaan tidak dapat diproses.'), galat.status as ContentfulStatusCode)
    }
    log.galat('permintaan.gagal', { idPermintaan: c.get('idPermintaan'), galat })
    return c.json(badanGalat('SERVER', 'Terjadi kesalahan pada server. Coba lagi beberapa saat.'), 500)
  })

  return app
}
