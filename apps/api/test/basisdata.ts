import { randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { buatKlien, type Klien, type OpsiKlien } from '../src/basisdata/klien'
import type { UrlDb } from '../src/konfigurasi'
import { buatPenyandi, type BarisKunciData, type Penyandi } from '../src/kripto/penyandi'
import { AWALAN_DB_UJI, KID_UJI, KUNCI_INDEKS_UJI, KUNCI_UTAMA_UJI, muatEnvLokal, NAMA_TEMPLAT, PESAN_TANPA_DB, urlDbDari } from './env-uji'

/** Penyandi uji: kunci data dibaca dari `kunci_data` basis data uji, dibuka dengan kunci utama uji. */
export async function penyandiUji(sql: postgres.Sql): Promise<Penyandi> {
  const baris = await sql<BarisKunciData[]>`select kid, dibungkus from kunci_data`
  return buatPenyandi(KUNCI_UTAMA_UJI, [...baris], KID_UJI, KUNCI_INDEKS_UJI)
}

export type DbUji = {
  /** Empat kolam peran aplikasi, seperti yang dipakai server. */
  klien: Klien
  /** Sambungan peran migrasi (pemilik skema) untuk menyiapkan dan memeriksa keadaan di uji. */
  sqlMigrasi: postgres.Sql
  urlDb: UrlDb
  nama: string
  tutup(): Promise<void>
}

/**
 * Mengkloning basis data cetakan menjadi basis data khusus berkas uji ini. **Gagal keras** (bukan terlewat) bila
 * PostgreSQL belum siap, supaya uji basis data yang tidak jalan tidak terlihat seperti hijau.
 */
export async function buatDbUji(opsi: OpsiKlien = {}): Promise<DbUji> {
  if (process.env.SINFODES_TEMPLAT_SIAP !== '1' || !muatEnvLokal()) throw new Error(PESAN_TANPA_DB)
  const nama = `${AWALAN_DB_UJI}${randomBytes(6).toString('hex')}`
  const urlAsal = urlDbDari(process.env, 'postgres')
  const admin = postgres(urlAsal.migrasi, { max: 1, onnotice: () => {} })
  try {
    for (let percobaan = 1; ; percobaan++) {
      try {
        await admin.unsafe(`CREATE DATABASE ${nama} OWNER sinfodes_migrasi TEMPLATE ${NAMA_TEMPLAT}`)
        break
      } catch (e) {
        // 55006: cetakan sedang diakses oleh kloning lain; coba lagi sebentar.
        if ((e as { code?: string }).code !== '55006' || percobaan >= 8) throw e
        await new Promise((r) => setTimeout(r, 150 * percobaan))
      }
    }
  } finally {
    await admin.end()
  }

  const urlDb = urlDbDari(process.env, nama)
  const klien = buatKlien(urlDb, opsi)
  const sqlMigrasi = postgres(urlDb.migrasi, { max: 2, onnotice: () => {} })
  return {
    klien,
    sqlMigrasi,
    urlDb,
    nama,
    async tutup() {
      await klien.tutup()
      await sqlMigrasi.end({ timeout: 5 })
      const pembersih = postgres(urlAsal.migrasi, { max: 1, onnotice: () => {} })
      try {
        await pembersih.unsafe(`DROP DATABASE IF EXISTS ${nama} WITH (FORCE)`)
      } finally {
        await pembersih.end()
      }
    },
  }
}
