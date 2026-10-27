import { AKUN_WARGA_DEMO } from '@sinfodes/demo/data/warga-demo'
import { KATA_SANDI_DEMO } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { aturTokenSesi, SESI_KUKI } from '@/api/client'
import { masukKabupaten } from '@/api/kabupaten'
import { masukKonsol } from '@/api/konsol'
import { masuk } from '@/api/sesi'
import { masukWarga } from '@/api/warga'
import { buatDbUji, penyandiUji, type DbUji } from './basisdata'
import { rakitApp } from './rakit-app'
import { ToplesKuki } from './toples-cookie'

type PerangkatApiNyata = {
  uji: DbUji
  jar: ToplesKuki
  /** Memindahkan "peramban" ke alamat lain: `null` untuk induk, `'konsol'`, slug desa, atau `kab-...`. */
  keAlamat(label: string | null): void
  asal(): string
  /** Jam server (bawaannya `SEKARANG_UJI`); dikembalikan ke bawaan sesudah tiap uji. */
  keWaktu(waktu: Date): void
  /** Menaruh cookie di toples untuk alamat tertentu, mis. untuk menguji cookie yang dikirim ke alamat atau keluarga yang salah. */
  pasangKukiDi(label: string | null, namaDanNilai: string): void
  /** Header `Cookie` yang akan dikirim ke alamat itu (atau null). */
  kukiDi(label: string | null): string | null
}

let aktif: PerangkatApiNyata | null = null
const perangkat = (): PerangkatApiNyata => {
  if (!aktif) throw new Error('pakaiApiNyata() belum dipanggil di berkas uji ini.')
  return aktif
}

const BAGIAN_SESI = ['admin', 'warga', 'konsol', 'kabupaten'] as const

/**
 * Menyalakan server sungguhan (aplikasi Hono + PostgreSQL hasil kloning cetakan) untuk satu berkas uji, dan menyambungkan
 * `panggilApi` web ke sana: `fetch` global dialihkan ke `app.fetch` lewat toples cookie, dan `window.location.origin`
 * menunjuk alamat desa. Saudara dari `pakaiApiTiruan()`; modul `api/*` web dipakai apa adanya. Dengan `segarTiapUji`,
 * basis data dikloning ulang sebelum setiap uji (untuk uji yang mengubah data, seperti `dbSegarTiapUji` di tiruan).
 */
export function pakaiApiNyata(opsi: { alamat?: string; segarTiapUji?: boolean } = {}): PerangkatApiNyata {
  const awal = opsi.alamat ?? 'sungaisialang'
  const lokasi = { origin: '' }
  const jar = new ToplesKuki()
  let waktuSekarang = SEKARANG_UJI
  const asal = (label: string | null): string => `http://${label ? `${label}.` : ''}sinfodes.localhost`
  const keAlamat = (label: string | null): void => {
    lokasi.origin = asal(label)
  }
  keAlamat(awal)
  const ini: PerangkatApiNyata = {
    uji: undefined as unknown as DbUji,
    jar,
    keAlamat,
    asal: () => lokasi.origin,
    keWaktu: (waktu) => {
      waktuSekarang = waktu
    },
    pasangKukiDi: (label, namaDanNilai) => jar.simpan(new URL(asal(label)).host, [namaDanNilai]),
    kukiDi: (label) => jar.header(new URL(asal(label)).host),
  }

  const bangun = async (): Promise<void> => {
    const uji = await buatDbUji()
    ini.uji = uji
    const { app } = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => waktuSekarang })
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
  }
  const bongkar = async (): Promise<void> => {
    vi.unstubAllGlobals()
    aktif = null
    await ini.uji?.tutup()
  }

  if (opsi.segarTiapUji) {
    beforeEach(bangun)
    afterEach(bongkar)
  } else {
    beforeAll(bangun)
    afterAll(bongkar)
  }
  afterEach(() => {
    for (const bagian of BAGIAN_SESI) aturTokenSesi(null, bagian)
    jar.kosongkan()
    keAlamat(awal)
    waktuSekarang = SEKARANG_UJI
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

/** Warga masuk dengan NIK dan PIN demo di alamat desanya (saudara `masukSebagaiWarga` tiruan). */
export async function masukSebagaiWarga(pendudukId: string): Promise<void> {
  const p = perangkat()
  const akun = AKUN_WARGA_DEMO.find((a) => a.pendudukId === pendudukId)
  if (!akun) throw new Error(`Akun warga ${pendudukId} tidak ada di data demo.`)
  const [d] = await p.uji.sqlMigrasi`select slug from desa where id = ${akun.desaId}`
  p.keAlamat(d.slug as string)
  await masukWarga(akun.nik, akun.pin)
  aturTokenSesi(SESI_KUKI, 'warga')
}

/** Tim Sinfodes masuk di alamat Konsol dengan akun semai (tanpa TOTP di lingkungan uji). */
export async function masukKonsolSebagai(penggunaId: string): Promise<void> {
  const p = perangkat()
  const [b] = await p.uji.sqlMigrasi`select email from pengguna_konsol where id = ${penggunaId}`
  if (!b) throw new Error(`Pengguna Konsol ${penggunaId} tidak ada di data semai.`)
  p.keAlamat('konsol')
  await masukKonsol(b.email as string, KATA_SANDI_DEMO)
  aturTokenSesi(SESI_KUKI, 'konsol')
}

/** Akun kabupaten masuk di alamat kabupatennya dengan akun semai. */
export async function masukKabupatenSebagai(penggunaId: string): Promise<void> {
  const p = perangkat()
  const [b] = await p.uji.sqlMigrasi`select pk.email, km.label from pengguna_kabupaten pk join kabupaten_mitra km on km.kode = pk.kabupaten_kode where pk.id = ${penggunaId}`
  if (!b) throw new Error(`Pengguna kabupaten ${penggunaId} tidak ada di data semai.`)
  p.keAlamat(b.label as string)
  await masukKabupaten(b.email as string, KATA_SANDI_DEMO)
  aturTokenSesi(SESI_KUKI, 'kabupaten')
}
