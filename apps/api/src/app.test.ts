import { galatSchema } from '@sinfodes/kontrak/api'
import { describe, expect, it } from 'vitest'
import { klienTanpaDb, penyandiTanpaDb } from '../test/rakit-app'
import { buatApp } from './app'
import { muatKonfigurasi } from './konfigurasi'
import { buatPencatat } from './log'

const acak = (awal: number) => Buffer.from(Array.from({ length: 32 }, (_, i) => (awal + i * 7) % 256)).toString('base64')
const env = (ubah: Record<string, string> = {}) => ({
  LINGKUNGAN: 'pengembangan',
  PORT: '3001',
  DOMAIN_INDUK: 'sinfodes.localhost',
  DB_URL_MIGRASI: 'postgres://a:Zq8vK2mR9xT4@localhost/d',
  DB_URL_DESA: 'postgres://b:Hn3wL7cP5yB1@localhost/d',
  DB_URL_KABUPATEN: 'postgres://c:Jd6sF0qA8uE2@localhost/d',
  DB_URL_KONSOL: 'postgres://d:Gt4gM1zX7oV9@localhost/d',
  DB_URL_PUBLIK: 'postgres://e:Rb5kC3hY6nW0@localhost/d',
  KUNCI_UTAMA: acak(11),
  KUNCI_INDEKS: acak(97),
  KID_AKTIF: 'k1',
  ...ubah,
})

function rakit(ubahEnv: Record<string, string> = {}) {
  const baris: string[] = []
  const log = buatPencatat((b) => baris.push(b), () => new Date('2026-09-24T02:00:00Z'))
  const app = buatApp({ konfigurasi: muatKonfigurasi(env(ubahEnv)), log, waktu: () => new Date('2026-09-24T02:00:00Z'), klien: klienTanpaDb, penyandi: penyandiTanpaDb() })
  return { app, baris, json: () => baris.map((b) => JSON.parse(b) as Record<string, unknown>) }
}
const minta = (app: ReturnType<typeof rakit>['app'], url: string, init?: RequestInit) => app.fetch(new Request(url, init))

describe('kerangka aplikasi', () => {
  it('GET /sehat menjawab 200 tanpa basis data', async () => {
    const { app } = rakit()
    const r = await minta(app, 'http://localhost/sehat')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ hidup: true })
  })

  it('rute tak dikenal menjawab 404 dalam bentuk galat kontrak', async () => {
    const { app } = rakit()
    const r = await minta(app, 'http://sinfodes.localhost/api/v1/tidak-ada')
    expect(r.status).toBe(404)
    const isi = galatSchema.parse(await r.json())
    expect(isi.error.code).toBe('NOT_FOUND')
  })

  it('setiap jawaban membawa ID permintaan unik; ID dari klien diabaikan', async () => {
    const { app } = rakit()
    const a = await minta(app, 'http://localhost/sehat', { headers: { 'X-Request-Id': 'dari-klien-0000' } })
    const b = await minta(app, 'http://localhost/sehat')
    expect(a.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(a.headers.get('X-Request-Id')).not.toBe('dari-klien-0000')
    expect(a.headers.get('X-Request-Id')).not.toBe(b.headers.get('X-Request-Id'))
  })

  it('header keamanan dan no-store untuk /api/v1', async () => {
    const { app } = rakit()
    const r = await minta(app, 'http://localhost/api/v1/tidak-ada')
    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(r.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(r.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(r.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(r.headers.get('Content-Security-Policy')).toBe("default-src 'none'; frame-ancestors 'none'")
    expect(r.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
    expect(r.headers.get('Cache-Control')).toBe('no-store')
  })

  it('HSTS hanya di staging, produksi, atau skema https', async () => {
    expect((await minta(rakit().app, 'http://localhost/sehat')).headers.get('Strict-Transport-Security')).toBeNull()
    expect((await minta(rakit().app, 'https://localhost/sehat')).headers.get('Strict-Transport-Security')).toMatch(/^max-age=\d+/)
    const produksi = rakit({ LINGKUNGAN: 'produksi', DOMAIN_INDUK: 'sinfodes.id' }).app
    expect((await minta(produksi, 'http://sinfodes.id/sehat')).headers.get('Strict-Transport-Security')).toMatch(/^max-age=\d+/)
  })

  it('galat tak terduga: 500 SERVER tanpa tumpukan maupun detail SQL, tercatat di log dengan ID permintaan', async () => {
    const { app, baris, json } = rakit()
    app.get('/api/v1/meledak', () => {
      throw new Error('relation "penduduk" does not exist; SELECT nik FROM penduduk')
    })
    const r = await minta(app, 'http://localhost/api/v1/meledak')
    expect(r.status).toBe(500)
    const teks = await r.text()
    expect(galatSchema.parse(JSON.parse(teks)).error.code).toBe('SERVER')
    expect(teks).not.toContain('penduduk')
    expect(teks).not.toContain('SELECT')
    expect(teks).not.toContain('    at ')
    const galat = json().find((j) => j.tingkat === 'galat')
    expect(galat?.idPermintaan).toBe(r.headers.get('X-Request-Id'))
    expect(baris.join('')).toContain('relation')
  })

  it('badan di atas batas ditolak 413 dalam bentuk galat kontrak', async () => {
    const { app } = rakit()
    app.post('/api/v1/uji-isi', async (c) => c.json({ ukuran: (await c.req.text()).length }))
    const besar = 'x'.repeat(2 * 1024 * 1024)
    const r = await minta(app, 'http://localhost/api/v1/uji-isi', { method: 'POST', body: besar })
    expect(r.status).toBe(413)
    expect(galatSchema.parse(await r.json()).error.code).toBe('VALIDATION')
    const kecil = await minta(app, 'http://localhost/api/v1/uji-isi', { method: 'POST', body: 'ok', headers: { Origin: 'http://localhost' } })
    expect(kecil.status).toBe(200)
  })

  it('log permintaan berisi metode, path tanpa query, status, dan durasi', async () => {
    const { app, json } = rakit()
    await minta(app, 'http://localhost/sehat?nik=1405095203918002')
    const entri = json().find((j) => j.peristiwa === 'permintaan')
    expect(entri).toMatchObject({ metode: 'GET', path: '/sehat', status: 200 })
    expect(typeof entri?.durasiMs).toBe('number')
    expect(JSON.stringify(entri)).not.toContain('1405095203918002')
  })
})
