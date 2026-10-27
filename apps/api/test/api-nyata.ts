import { KATA_SANDI_DEMO } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { aturTokenSesi, SESI_KUKI } from '@/api/client'
import { masuk } from '@/api/sesi'
import { buatDbUji, penyandiUji, type DbUji } from './basisdata'
import { rakitApp } from './rakit-app'
import { ToplesKuki } from './toples-cookie'

type PerangkatApiNyata = {
  uji: DbUji
  jar: ToplesKuki
  /** Memindahkan "peramban" ke alamat lain: `null` untuk induk, `'konsol'`, atau slug desa. */
  keAlamat(label: string | null): void
  asal(): string
}

let aktif: PerangkatApiNyata | null = null
const perangkat = (): PerangkatApiNyata => {
  if (!aktif) throw new Error('pakaiApiNyata() belum dipanggil di berkas uji ini.')
  return aktif
}

/**
 * Menyalakan server sungguhan (aplikasi Hono + PostgreSQL hasil kloning cetakan) untuk satu berkas uji, dan menyambungkan
 * `panggilApi` web ke sana: `fetch` global dialihkan ke `app.fetch` lewat toples cookie, dan `window.location.origin`
 * menunjuk alamat desa. Saudara dari `pakaiApiTiruan()`; modul `api/*` web dipakai apa adanya.
 */
export function pakaiApiNyata(opsi: { alamat?: string } = {}): PerangkatApiNyata {
  const awal = opsi.alamat ?? 'sungaisialang'
  const lokasi = { origin: '' }
  const jar = new ToplesKuki()
  const keAlamat = (label: string | null): void => {
    lokasi.origin = `http://${label ? `${label}.` : ''}sinfodes.localhost`
  }
  keAlamat(awal)
  const ini = { jar, keAlamat, asal: () => lokasi.origin } as PerangkatApiNyata

  beforeAll(async () => {
    const uji = await buatDbUji()
    ini.uji = uji
    const { app } = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => SEKARANG_UJI })
    vi.stubGlobal('window', { location: lokasi })
    vi.stubGlobal('fetch', async (masukan: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(masukan instanceof Request ? masukan.url : String(masukan))
      const headers = new Headers(init?.headers)
      const kuki = jar.header(url.host)
      if (kuki) headers.set('Cookie', kuki)
      // Peramban menambahkan Origin pada setiap permintaan yang mengubah data.
      const metode = (init?.method ?? 'GET').toUpperCase()
      if (metode !== 'GET' && metode !== 'HEAD') headers.set('Origin', url.origin)
      const respons = await app.fetch(new Request(url, { ...init, headers }))
      jar.simpan(url.host, respons.headers.getSetCookie())
      return respons
    })
    aktif = ini
  })
  afterEach(() => {
    aturTokenSesi(null)
    jar.kosongkan()
    keAlamat(awal)
  })
  afterAll(async () => {
    vi.unstubAllGlobals()
    aktif = null
    await ini.uji?.tutup()
  })
  return ini
}

/**
 * Masuk lewat rute sungguhan (`POST /sesi/masuk` dengan akun semai dan `KATA_SANDI_DEMO`) di alamat desa akun itu, lalu
 * menandai "sudah masuk" seperti yang dilakukan aplikasi. Saudara dari `masukSebagai` API tiruan.
 */
export async function masukSebagai(penggunaId: string): Promise<void> {
  const p = perangkat()
  const [b] = await p.uji.sqlMigrasi`select pg.email, d.slug from pengguna pg join desa d on d.id = pg.desa_id where pg.id = ${penggunaId}`
  if (!b) throw new Error(`Pengguna ${penggunaId} tidak ada di data semai.`)
  p.keAlamat(b.slug as string)
  await masuk(b.email as string, KATA_SANDI_DEMO)
  aturTokenSesi(SESI_KUKI)
}
