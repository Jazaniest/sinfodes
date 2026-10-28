import { randomBytes } from 'node:crypto'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import type { Context } from 'hono'
import type postgres from 'postgres'
import { buatApp } from '../src/app'
import type { Klien } from '../src/basisdata/klien'
import { muatKonfigurasi, type Konfigurasi } from '../src/konfigurasi'
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
  /** Menimpa konfigurasi hasil `muatKonfigurasi` (mis. `totpKonsolWajib`) tanpa menyetel lingkungan staging yang ketat. */
  ubahKonfigurasi?: (k: Konfigurasi) => Konfigurasi
  ipKlien?: (c: Context) => string
}

export function rakitApp(opsi: OpsiRakit = {}) {
  const baris: string[] = []
  const waktu = opsi.waktu ?? (() => SEKARANG_UJI)
  const log = buatPencatat((b) => baris.push(b), waktu)
  const app = buatApp({
    konfigurasi: (opsi.ubahKonfigurasi ?? ((k) => k))(muatKonfigurasi(envUji(opsi.ubahEnv))),
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

type OpsiSesiDasar = { dibuat: Date; terakhirAktif?: Date; dicabut?: Date | null; awalan?: string }
const JAM_MS = 3600_000

/** Sesi warga langsung lewat peran migrasi. Tanpa batas mutlak (SPEC-V0.3 §8.2). */
export async function sisipSesiWargaUji(sql: postgres.Sql, p: OpsiSesiDasar & { pendudukId: string; desaId: string }): Promise<SesiUji> {
  const { token, hash } = buatTokenSesi()
  const id = `sw_${randomBytes(9).toString('base64url')}`
  await sql`insert into sesi_warga (id, desa_id, penduduk_id, token_hash, dibuat, terakhir_aktif, dicabut)
    values (${id}, ${p.desaId}, ${p.pendudukId}, ${hash}, ${p.dibuat}, ${p.terakhirAktif ?? p.dibuat}, ${p.dicabut ?? null})`
  return { id, token, kuki: `${p.awalan ?? '__Host-'}warga=${token}` }
}

/** Sesi Konsol langsung lewat peran migrasi; batas mutlak 8 jam. */
export async function sisipSesiKonsolUji(sql: postgres.Sql, p: OpsiSesiDasar & { penggunaId: string; kedaluwarsaMutlak?: Date }): Promise<SesiUji> {
  const { token, hash } = buatTokenSesi()
  const id = `sk_${randomBytes(9).toString('base64url')}`
  const mutlak = p.kedaluwarsaMutlak ?? new Date(p.dibuat.getTime() + 8 * JAM_MS)
  await sql`insert into sesi_konsol (id, pengguna_id, token_hash, dibuat, terakhir_aktif, kedaluwarsa_mutlak, dicabut)
    values (${id}, ${p.penggunaId}, ${hash}, ${p.dibuat}, ${p.terakhirAktif ?? p.dibuat}, ${mutlak}, ${p.dicabut ?? null})`
  return { id, token, kuki: `${p.awalan ?? '__Host-'}konsol=${token}` }
}

/** Sesi kabupaten langsung lewat peran migrasi; batas mutlak 12 jam. */
export async function sisipSesiKabupatenUji(
  sql: postgres.Sql,
  p: OpsiSesiDasar & { penggunaId: string; kabupatenKode: string; kedaluwarsaMutlak?: Date },
): Promise<SesiUji> {
  const { token, hash } = buatTokenSesi()
  const id = `sb_${randomBytes(9).toString('base64url')}`
  const mutlak = p.kedaluwarsaMutlak ?? new Date(p.dibuat.getTime() + 12 * JAM_MS)
  await sql`insert into sesi_kabupaten (id, pengguna_id, kabupaten_kode, token_hash, dibuat, terakhir_aktif, kedaluwarsa_mutlak, dicabut)
    values (${id}, ${p.penggunaId}, ${p.kabupatenKode}, ${hash}, ${p.dibuat}, ${p.terakhirAktif ?? p.dibuat}, ${mutlak}, ${p.dicabut ?? null})`
  return { id, token, kuki: `${p.awalan ?? '__Host-'}kab=${token}` }
}

/** Akses bantuan langsung lewat peran migrasi: `sampai` = `mulai` + `lamaJam` (bawaan 24 jam dari sekarang). */
export async function sisipAksesUji(
  sql: postgres.Sql,
  p: { desaId: string; lamaJam?: number; sembunyikan?: boolean; mulai?: Date; diberiOlehId?: string; diberiOlehNama?: string; dicabut?: Date | null },
): Promise<{ id: string; mulai: Date; sampai: Date }> {
  const id = `aks_${randomBytes(6).toString('base64url')}`
  const mulai = p.mulai ?? new Date()
  const sampai = new Date(mulai.getTime() + (p.lamaJam ?? 24) * JAM_MS)
  await sql`insert into akses_bantuan (id, desa_id, diberi_oleh_id, diberi_oleh_nama, mulai, sampai, sembunyikan_data_pribadi, dicabut)
    values (${id}, ${p.desaId}, ${p.diberiOlehId ?? 'pgn_uji'}, ${p.diberiOlehNama ?? 'Pemberi Uji'}, ${mulai}, ${sampai}, ${p.sembunyikan ?? true}, ${p.dicabut ?? null})`
  return { id, mulai, sampai }
}

/** Tiket bantuan langsung lewat peran migrasi; mengembalikan token polosnya (yang tersimpan hanya hash). */
export async function sisipTiketUji(
  sql: postgres.Sql,
  p: { desaId: string; aksesId: string; mulai?: Date; umurMs?: number; dipakai?: Date | null; olehId?: string; olehNama?: string },
): Promise<{ id: string; tiket: string }> {
  const { token, hash } = buatTokenSesi()
  const id = `tkt_${randomBytes(6).toString('base64url')}`
  const mulai = p.mulai ?? new Date()
  await sql`insert into tiket_bantuan (id, desa_id, akses_id, token_hash, oleh_id, oleh_nama, dibuat, berlaku_sampai, dipakai)
    values (${id}, ${p.desaId}, ${p.aksesId}, ${hash}, ${p.olehId ?? 'kon_uji'}, ${p.olehNama ?? 'Dina Uji'}, ${mulai}, ${new Date(mulai.getTime() + (p.umurMs ?? 60_000))}, ${p.dipakai ?? null})`
  return { id, tiket: token }
}

/** Sesi bantuan langsung lewat peran migrasi. Cookie-nya cookie panel (sesi bantuan hidup di keluarga panel). */
export async function sisipSesiBantuanUji(
  sql: postgres.Sql,
  p: OpsiSesiDasar & { desaId: string; aksesId: string; olehId?: string; olehNama?: string },
): Promise<SesiUji> {
  const { token, hash } = buatTokenSesi()
  const id = `sbt_${randomBytes(9).toString('base64url')}`
  await sql`insert into sesi_bantuan (id, desa_id, akses_id, token_hash, oleh_id, oleh_nama, dibuat, terakhir_aktif, dicabut)
    values (${id}, ${p.desaId}, ${p.aksesId}, ${hash}, ${p.olehId ?? 'kon_uji'}, ${p.olehNama ?? 'Dina Uji'}, ${p.dibuat}, ${p.terakhirAktif ?? p.dibuat}, ${p.dicabut ?? null})`
  return { id, token, kuki: `${p.awalan ?? '__Host-'}panel=${token}` }
}
