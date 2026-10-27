/**
 * Persiapan sekali jalan untuk pengembangan lokal (PostgreSQL di Laragon): membuat basis data `sinfodes_dev`, lima peran
 * dengan kata sandi acak, dan kunci enkripsi, lalu menambahkannya ke `apps/api/.env.local`. Aman diulang: nilai yang sudah
 * ada di berkas tidak ditimpa. Nilai rahasia tidak pernah dicetak.
 */
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { bacaEnv, PERAN_DB, rencanaEnv } from './env-lokal'

const BERKAS_ENV = fileURLToPath(new URL('../.env.local', import.meta.url))
const BASIS_DATA = 'sinfodes_dev'
const VERSI_MINIMAL = 150000
const PERAN_APLIKASI = PERAN_DB.filter((p) => p !== 'migrasi')

const berhenti = (pesan: string): never => {
  console.error(`\nGagal: ${pesan}`)
  process.exit(1)
}

const acakAlfanumerik = (panjang: number): string => {
  let hasil = ''
  while (hasil.length < panjang) hasil += randomBytes(32).toString('base64').replace(/[^A-Za-z0-9]/g, '')
  return hasil.slice(0, panjang)
}

const env = existsSync(BERKAS_ENV) ? bacaEnv(readFileSync(BERKAS_ENV, 'utf8')) : {}
const urlSuper = process.env.PG_SUPERUSER_URL ?? env.PG_SUPERUSER_URL
if (!urlSuper) berhenti('PG_SUPERUSER_URL belum diisi. Buat apps/api/.env.local berisi satu baris PG_SUPERUSER_URL=postgres://postgres:KATA_SANDI@localhost:5432/postgres')

const super_ = new URL(urlSuper as string)
const ke = (basisData: string): string => {
  const u = new URL(super_)
  u.pathname = `/${basisData}`
  return u.toString()
}

const admin = postgres(ke(super_.pathname.slice(1) || 'postgres'), { max: 1, onnotice: () => {}, connect_timeout: 8 })
try {
  const [{ versi }] = await admin<{ versi: number }[]>`select current_setting('server_version_num')::int as versi`
  const [{ teks }] = await admin<{ teks: string }[]>`select current_setting('server_version') as teks`
  if (versi < VERSI_MINIMAL) berhenti(`PostgreSQL ${teks} terlalu lama. Dibutuhkan minimal versi 15 (disarankan 17).`)
  console.log(`PostgreSQL ${teks}: terhubung.`)

  const rencana = rencanaEnv(env, {
    host: super_.hostname,
    port: super_.port || '5432',
    basisData: BASIS_DATA,
    sandiAcak: () => acakAlfanumerik(32),
    kunciAcak: () => randomBytes(32).toString('base64'),
  })

  // Peran: dibuat bila belum ada, atau kata sandinya disetel ulang bila URL-nya hilang dari .env.local.
  for (const { peran, kataSandi } of rencana.peranBaru) {
    const nama = `sinfodes_${peran}`
    const atribut = `LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS ${peran === 'migrasi' ? 'CREATEDB' : 'NOCREATEDB'}`
    const [ada] = await admin`select 1 from pg_roles where rolname = ${nama}`
    // Kata sandi acak hanya huruf dan angka, jadi aman disisipkan ke pernyataan utilitas yang tidak menerima parameter.
    await admin.unsafe(`${ada ? 'ALTER' : 'CREATE'} ROLE ${nama} ${atribut} PASSWORD '${kataSandi}'`)
  }
  for (const peran of PERAN_APLIKASI) {
    await admin.unsafe(`ALTER ROLE sinfodes_${peran} SET statement_timeout = '15s'`)
    await admin.unsafe(`ALTER ROLE sinfodes_${peran} SET idle_in_transaction_session_timeout = '15s'`)
  }

  const [adaDb] = await admin`select 1 from pg_database where datname = ${BASIS_DATA}`
  if (!adaDb) {
    try {
      await admin.unsafe(
        `CREATE DATABASE ${BASIS_DATA} OWNER sinfodes_migrasi TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'id-ID'`,
      )
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e)
      berhenti(`basis data tidak dapat dibuat dengan kolasi ICU (${pesan}). Server ini mungkin dibangun tanpa ICU; jangan diteruskan dengan kolasi lain tanpa keputusan.`)
    }
    console.log(`Basis data ${BASIS_DATA} dibuat (kolasi ICU id-ID).`)
  }

  const dalam = postgres(ke(BASIS_DATA), { max: 1, onnotice: () => {} })
  try {
    await dalam.unsafe(`REVOKE ALL ON DATABASE ${BASIS_DATA} FROM PUBLIC`)
    await dalam.unsafe(`GRANT CONNECT ON DATABASE ${BASIS_DATA} TO ${PERAN_DB.map((p) => `sinfodes_${p}`).join(', ')}`)
  } finally {
    await dalam.end()
  }

  if (rencana.barisBaru.length > 0) {
    const awalan = existsSync(BERKAS_ENV) && !readFileSync(BERKAS_ENV, 'utf8').endsWith('\n') ? '\n' : ''
    const judul = Object.keys(env).length === 0 ? '# Dibuat oleh `pnpm --filter @sinfodes/api db:siapkan`. Rahasia: jangan dibagikan atau di-commit.\n' : ''
    appendFileSync(BERKAS_ENV, `${awalan}${judul}${rencana.barisBaru.join('\n')}\n`)
    console.log(`Ditambahkan ke apps/api/.env.local: ${rencana.barisBaru.map((b) => b.split('=')[0]).join(', ')}`)
  } else {
    console.log('apps/api/.env.local sudah lengkap; tidak ada yang ditambahkan.')
  }
  console.log('Selesai. Langkah berikutnya: pnpm --filter @sinfodes/api db:migrasi')
} finally {
  await admin.end()
}
