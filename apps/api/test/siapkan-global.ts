import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { jalankanMigrasi } from '../src/basisdata/pelari-migrasi'
import { buatPenyandi } from '../src/kripto/penyandi'
import { pastikanKunciData, semaiDunia } from '../src/semai/semai'
import { AWALAN_DB_UJI, KID_UJI, keBasisData, KUNCI_INDEKS_UJI, KUNCI_UTAMA_UJI, muatEnvLokal, NAMA_TEMPLAT, PESAN_TANPA_DB } from './env-uji'

/**
 * `globalSetup` Vitest: membangun basis data cetakan sekali per jalan (migrasi, lalu semai), supaya tiap berkas uji
 * cukup mengkloningnya. Tanpa PostgreSQL, uji murni tetap jalan; uji basis data gagal keras lewat `buatDbUji`.
 */
export default async function siapkan(): Promise<() => Promise<void>> {
  delete process.env.SINFODES_TEMPLAT_SIAP
  if (!muatEnvLokal()) {
    console.warn(`\n[uji basis data dilewati] ${PESAN_TANPA_DB}\n`)
    return async () => {}
  }
  const urlMigrasi = process.env.DB_URL_MIGRASI as string
  const admin = postgres(urlMigrasi, { max: 1, onnotice: () => {}, connect_timeout: 5 })
  try {
    await admin`select 1`
  } catch {
    await admin.end({ timeout: 1 }).catch(() => {})
    console.warn(`\n[uji basis data dilewati] ${PESAN_TANPA_DB}\n`)
    return async () => {}
  }

  const bersihkan = async (): Promise<void> => {
    const sisa = await admin<{ datname: string }[]>`select datname from pg_database where datname like ${`${AWALAN_DB_UJI}%`}`
    for (const { datname } of sisa) await admin.unsafe(`DROP DATABASE IF EXISTS ${datname} WITH (FORCE)`)
    await admin.unsafe(`DROP DATABASE IF EXISTS ${NAMA_TEMPLAT} WITH (FORCE)`)
  }

  await bersihkan()
  await admin.unsafe(
    `CREATE DATABASE ${NAMA_TEMPLAT} OWNER sinfodes_migrasi TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'id-ID'`,
  )
  const templat = postgres(keBasisData(urlMigrasi, NAMA_TEMPLAT), { max: 1, onnotice: () => {} })
  try {
    await jalankanMigrasi(templat, fileURLToPath(new URL('../migrasi', import.meta.url)))
    const kunci = await pastikanKunciData(templat, KUNCI_UTAMA_UJI, KID_UJI)
    const penyandi = buatPenyandi(KUNCI_UTAMA_UJI, kunci, KID_UJI, KUNCI_INDEKS_UJI)
    await semaiDunia(templat, penyandi, SEKARANG_UJI, { lingkungan: 'uji' })
  } finally {
    await templat.end()
  }
  process.env.SINFODES_TEMPLAT_SIAP = '1'

  return async () => {
    await bersihkan()
    await admin.end({ timeout: 5 })
  }
}
