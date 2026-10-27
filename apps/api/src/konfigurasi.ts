export const LINGKUNGAN = ['pengembangan', 'uji', 'staging', 'produksi'] as const
export type Lingkungan = (typeof LINGKUNGAN)[number]

export type UrlDb = { migrasi: string; desa: string; kabupaten: string; konsol: string; publik: string }

export type Konfigurasi = {
  lingkungan: Lingkungan
  port: number
  domainInduk: string
  urlDb: UrlDb
  /** Kunci pembungkus kunci data (SPEC-V0.3 §15.1), 32 bita. */
  kunciUtama: Buffer
  /** Kunci HMAC untuk indeks pencarian persis, 32 bita, terpisah dari kunci utama. */
  kunciIndeks: Buffer
  kidAktif: string
  cookieAwalan: '__Host-' | '__Secure-'
  /** Akun Konsol tanpa TOTP ditolak (staging dan produksi); di lingkungan lain akun yang belum didaftarkan TOTP boleh masuk dengan kata sandi. */
  totpKonsolWajib: boolean
}

/** Semua masalah konfigurasi sekaligus. Pesannya menyebut nama variabel, tidak pernah nilainya. */
export class GalatKonfigurasi extends Error {
  readonly masalah: readonly string[]
  constructor(masalah: string[]) {
    super(`Konfigurasi tidak valid:\n- ${masalah.join('\n- ')}`)
    this.name = 'GalatKonfigurasi'
    this.masalah = masalah
  }
}

type Env = Record<string, string | undefined>
const POLA_CONTOH = /ganti|changeme|contoh|example|password|kata-?sandi|secret|rahasia|xxx/i
const URL_DB = [
  ['DB_URL_MIGRASI', 'migrasi'],
  ['DB_URL_DESA', 'desa'],
  ['DB_URL_KABUPATEN', 'kabupaten'],
  ['DB_URL_KONSOL', 'konsol'],
  ['DB_URL_PUBLIK', 'publik'],
] as const

function bacaUrlDb(nama: string, nilai: string | undefined, ketat: boolean, masalah: string[]): string {
  if (!nilai) {
    masalah.push(`${nama} wajib diisi.`)
    return ''
  }
  let url: URL
  try {
    if (/\s/.test(nilai)) throw new Error('spasi')
    url = new URL(nilai)
  } catch {
    masalah.push(`${nama} bukan URL PostgreSQL yang sah.`)
    return ''
  }
  if (!/^postgres(ql)?:$/.test(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) {
    masalah.push(`${nama} harus berbentuk postgres://pengguna:kata-sandi@host:port/basisdata.`)
    return ''
  }
  if (ketat && (!url.password || POLA_CONTOH.test(decodeURIComponent(url.password)))) {
    masalah.push(`${nama} kosong atau masih berupa nilai contoh.`)
  }
  return nilai
}

function bacaKunci(nama: string, nilai: string | undefined, ketat: boolean, masalah: string[]): Buffer {
  if (!nilai) {
    masalah.push(`${nama} wajib diisi.`)
    return Buffer.alloc(0)
  }
  const kunci = /^[A-Za-z0-9+/_-]+={0,2}$/.test(nilai) ? Buffer.from(nilai.replaceAll('-', '+').replaceAll('_', '/'), 'base64') : Buffer.alloc(0)
  if (kunci.length !== 32) {
    masalah.push(`${nama} harus 32 bita dalam base64.`)
    return Buffer.alloc(0)
  }
  if (ketat && new Set(kunci).size < 8) masalah.push(`${nama} tampak seperti nilai contoh (terlalu seragam).`)
  return kunci
}

/** Memuat dan memeriksa konfigurasi dari variabel lingkungan; gagal cepat dengan semua masalah (SPEC-V0.3 §6.3). */
export function muatKonfigurasi(env: Env): Konfigurasi {
  const masalah: string[] = []
  const lingkungan = (LINGKUNGAN as readonly string[]).includes(env.LINGKUNGAN ?? '') ? (env.LINGKUNGAN as Lingkungan) : null
  if (!lingkungan) masalah.push(`LINGKUNGAN harus salah satu dari: ${LINGKUNGAN.join(', ')}.`)
  const ketat = lingkungan === 'produksi' || lingkungan === 'staging'

  const port = Number(env.PORT ?? '3001')
  if (!Number.isInteger(port) || port < 1 || port > 65535) masalah.push('PORT harus bilangan bulat 1-65535.')

  const domainInduk = env.DOMAIN_INDUK ?? ''
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(domainInduk)) {
    masalah.push('DOMAIN_INDUK wajib berupa nama domain huruf kecil.')
  } else if (ketat && (domainInduk === 'localhost' || domainInduk.endsWith('.localhost'))) {
    masalah.push('DOMAIN_INDUK tidak boleh domain lokal di staging dan produksi.')
  }

  const kidAktif = env.KID_AKTIF ?? ''
  if (!/^[a-z0-9_-]{1,16}$/.test(kidAktif)) masalah.push('KID_AKTIF harus 1-16 karakter huruf kecil, angka, garis bawah, atau tanda hubung.')

  const awalan = env.COOKIE_AWALAN ?? '__Host-'
  if (awalan !== '__Host-' && awalan !== '__Secure-') masalah.push('COOKIE_AWALAN harus __Host- atau __Secure-.')
  else if (ketat && awalan !== '__Host-') masalah.push('COOKIE_AWALAN harus __Host- di staging dan produksi.')

  const urlDb = Object.fromEntries(URL_DB.map(([nama, kunci]) => [kunci, bacaUrlDb(nama, env[nama], ketat, masalah)])) as UrlDb
  const kunciUtama = bacaKunci('KUNCI_UTAMA', env.KUNCI_UTAMA, ketat, masalah)
  const kunciIndeks = bacaKunci('KUNCI_INDEKS', env.KUNCI_INDEKS, ketat, masalah)

  if (masalah.length > 0 || !lingkungan) throw new GalatKonfigurasi(masalah)
  return { lingkungan, port, domainInduk, urlDb, kunciUtama, kunciIndeks, kidAktif, cookieAwalan: awalan as Konfigurasi['cookieAwalan'], totpKonsolWajib: ketat }
}
