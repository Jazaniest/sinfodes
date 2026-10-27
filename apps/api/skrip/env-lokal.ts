/** Logika murni `db:siapkan`: apa yang perlu ditambahkan ke `apps/api/.env.local` tanpa menimpa nilai yang sudah ada. */

export const PERAN_DB = ['migrasi', 'desa', 'kabupaten', 'konsol', 'publik'] as const
export type NamaPeran = (typeof PERAN_DB)[number]

export type KonteksEnv = {
  host: string
  port: string
  basisData: string
  /** Sandi peran acak (huruf dan angka saja, aman dimasukkan ke SQL dan URL tanpa pengkodean). */
  sandiAcak: () => string
  /** Kunci 32 bita acak dalam base64. */
  kunciAcak: () => string
}

export type RencanaEnv = {
  /** Baris `KUNCI=nilai` yang ditambahkan ke berkas. */
  barisBaru: string[]
  /** Peran yang perlu dibuat atau disetel ulang sandinya di PostgreSQL. */
  peranBaru: { peran: NamaPeran; kataSandi: string }[]
}

const BAWAAN: Record<string, string> = {
  LINGKUNGAN: 'pengembangan',
  PORT: '3001',
  DOMAIN_INDUK: 'sinfodes.localhost',
  KID_AKTIF: 'k1',
  COOKIE_AWALAN: '__Host-',
}

/** Membaca isi berkas bergaya `.env` (KUNCI=nilai, komentar `#`, kutip dibuang). */
export function bacaEnv(teks: string): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const baris of teks.split(/\r?\n/)) {
    const cocok = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(baris)
    if (!cocok || baris.trimStart().startsWith('#')) continue
    hasil[cocok[1]] = cocok[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  return hasil
}

export function rencanaEnv(sudahAda: Record<string, string | undefined>, k: KonteksEnv): RencanaEnv {
  const barisBaru: string[] = []
  const peranBaru: RencanaEnv['peranBaru'] = []
  const kosong = (kunci: string): boolean => !sudahAda[kunci]

  for (const peran of PERAN_DB) {
    const kunci = `DB_URL_${peran.toUpperCase()}`
    if (!kosong(kunci)) continue
    const kataSandi = k.sandiAcak()
    peranBaru.push({ peran, kataSandi })
    barisBaru.push(`${kunci}=postgres://sinfodes_${peran}:${kataSandi}@${k.host}:${k.port}/${k.basisData}`)
  }
  for (const kunci of ['KUNCI_UTAMA', 'KUNCI_INDEKS']) {
    if (kosong(kunci)) barisBaru.push(`${kunci}=${k.kunciAcak()}`)
  }
  for (const [kunci, nilai] of Object.entries(BAWAAN)) {
    if (kosong(kunci)) barisBaru.push(`${kunci}=${nilai}`)
  }
  return { barisBaru, peranBaru }
}
