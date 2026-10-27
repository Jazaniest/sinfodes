import { randomBytes } from 'node:crypto'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import type { Context } from 'hono'
import type postgres from 'postgres'
import { buatApp } from '../src/app'
import type { Klien } from '../src/basisdata/klien'
import { muatKonfigurasi } from '../src/konfigurasi'
import { buatPenyandi, buatKunciDataBaru, type Penyandi } from '../src/kripto/penyandi'
import { buatTokenSesi } from '../src/kripto/token'
import { buatPencatat } from '../src/log'
import { KID_UJI, KUNCI_INDEKS_UJI, KUNCI_UTAMA_UJI } from './env-uji'

const acak = (awal: number) => Buffer.from(Array.from({ length: 32 }, (_, i) => (awal + i * 7) % 256)).toString('base64')

/** Lingkungan lengkap yang lolos `muatKonfigurasi`; alamat basis data hanya pengisi (klien disuntik terpisah di uji). */
export const envUji = (ubah: Record<string, string> = {}): Record<string, string> => ({
  LINGKUNGAN: 'uji',
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

/** Klien yang gagal keras bila disentuh: membuktikan jalur tanpa basis data memang tidak memakainya. */
export const klienTanpaDb: Klien = {
  dalamTransaksi: () => {
    throw new Error('Uji ini tidak boleh menyentuh basis data.')
  },
  tutup: async () => {},
}

/** Penyandi dengan kunci uji tetap, tanpa membaca basis data. */
export const penyandiTanpaDb = (): Penyandi => buatPenyandi(KUNCI_UTAMA_UJI, [buatKunciDataBaru(KUNCI_UTAMA_UJI, KID_UJI)], KID_UJI, KUNCI_INDEKS_UJI)

/** Alamat IP klien dalam uji: header `X-Uji-Ip` (satu IP per uji supaya batas laju tidak saling mengganggu). */
export const ipUji = (c: Context): string => c.req.header('X-Uji-Ip') ?? 'tak-dikenal'

export type OpsiRakit = {
  klien?: Klien
  penyandi?: Penyandi
  waktu?: () => Date
  ubahEnv?: Record<string, string>
  ipKlien?: (c: Context) => string
}

export function rakitApp(opsi: OpsiRakit = {}) {
  const baris: string[] = []
  const waktu = opsi.waktu ?? (() => SEKARANG_UJI)
  const log = buatPencatat((b) => baris.push(b), waktu)
  const app = buatApp({
    konfigurasi: muatKonfigurasi(envUji(opsi.ubahEnv)),
    log,
    waktu,
    klien: opsi.klien ?? klienTanpaDb,
    penyandi: opsi.penyandi ?? penyandiTanpaDb(),
    ipKlien: opsi.ipKlien ?? ipUji,
  })
  return { app, baris, json: () => baris.map((b) => JSON.parse(b) as Record<string, unknown>) }
}

export type SesiUji = { id: string; token: string; kuki: string }

/** Menyisipkan sesi panel langsung lewat peran migrasi, tanpa lewat rute masuk (rute masuk diuji di Tugas 8). */
export async function sisipSesiUji(
  sql: postgres.Sql,
  p: { penggunaId: string; desaId: string; dibuat: Date; terakhirAktif?: Date; kedaluwarsaMutlak?: Date; dicabut?: Date | null; awalan?: string },
): Promise<SesiUji> {
  const { token, hash } = buatTokenSesi()
  const id = `ses_${randomBytes(9).toString('base64url')}`
  const mutlak = p.kedaluwarsaMutlak ?? new Date(p.dibuat.getTime() + 12 * 3600_000)
  await sql`insert into sesi (id, desa_id, pengguna_id, jenis, token_hash, dibuat, terakhir_aktif, kedaluwarsa_mutlak, dicabut)
    values (${id}, ${p.desaId}, ${p.penggunaId}, 'panel', ${hash}, ${p.dibuat}, ${p.terakhirAktif ?? p.dibuat}, ${mutlak}, ${p.dicabut ?? null})`
  return { id, token, kuki: `${p.awalan ?? '__Host-'}panel=${token}` }
}

/** Pasangan `nama=nilai` dari Set-Cookie pertama, atau null. */
export function kukiDariJawaban(r: Response): string | null {
  const baris = r.headers.getSetCookie()[0]
  return baris ? baris.split(';')[0] : null
}

type AppUji = ReturnType<typeof rakitApp>['app']

/** Masuk lewat rute sungguhan di alamat `basis`. */
export async function masukLewatRute(
  app: AppUji,
  basis: string,
  email: string,
  kataSandi = 'demo',
  ip = 'tak-dikenal',
): Promise<{ res: Response; kuki: string | null }> {
  const res = await app.fetch(
    new Request(`${basis}/api/v1/sesi/masuk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: basis, 'X-Uji-Ip': ip },
      body: JSON.stringify({ email, kataSandi }),
    }),
  )
  return { res, kuki: kukiDariJawaban(res) }
}

/** GET dengan cookie (tanpa Origin: GET tidak diperiksa CSRF). */
export const ambil = (app: AppUji, url: string, kuki?: string | null, tambahan: Record<string, string> = {}) =>
  app.fetch(new Request(url, { headers: { ...(kuki ? { Cookie: kuki } : {}), ...tambahan } }))

/** POST JSON dari asal yang sama dengan `basis`. */
export const kirimJson = (app: AppUji, basis: string, jalur: string, badan: unknown, kuki?: string | null, tambahan: Record<string, string> = {}) =>
  app.fetch(
    new Request(`${basis}${jalur}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: basis, ...(kuki ? { Cookie: kuki } : {}), ...tambahan },
      body: JSON.stringify(badan),
    }),
  )
