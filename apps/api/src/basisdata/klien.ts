import { sql as dsql } from 'drizzle-orm'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import { drizzle, type PostgresJsDatabase, type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { UrlDb } from '../konfigurasi'
import * as skema from './skema'

// Tipe dasar bersama kolam dan transaksi Drizzle: hanya kolam yang punya `$client`, transaksi tidak.
export type Db = PgDatabase<PostgresJsQueryResultHKT, typeof skema>
/** Peran aplikasi (SPEC-V0.3 §7.3). Peran migrasi tidak pernah dipakai server. */
export type PeranDb = 'desa' | 'kabupaten' | 'konsol' | 'publik'
export type KonteksDb = { desaId?: string }

export type Klien = {
  /**
   * Satu transaksi dengan peran basis data yang sesuai. Bila `konteks.desaId` ada, `sinfodes.desa_id` disetel lokal pada
   * transaksi ini sehingga RLS hanya meloloskan baris desa itu dan tidak tersisa di koneksi yang dipakai ulang (§7.4).
   */
  dalamTransaksi<T>(peran: PeranDb, konteks: KonteksDb, fn: (db: Db) => Promise<T>): Promise<T>
  tutup(): Promise<void>
}

export type OpsiKlien = { maks?: number }

/** Empat kolam koneksi terpisah, satu per peran, masing-masing dengan kata sandinya sendiri (SPEC-V0.3 §15.1). */
export function buatKlien(urlDb: UrlDb, opsi: OpsiKlien = {}): Klien {
  const maks = opsi.maks ?? 10
  const kolam: Record<PeranDb, postgres.Sql> = {
    desa: postgres(urlDb.desa, { max: maks, onnotice: () => {} }),
    kabupaten: postgres(urlDb.kabupaten, { max: maks, onnotice: () => {} }),
    konsol: postgres(urlDb.konsol, { max: maks, onnotice: () => {} }),
    publik: postgres(urlDb.publik, { max: maks, onnotice: () => {} }),
  }
  // Drizzle membungkus kolam, bukan transaksi postgres.js: hanya kolam yang membawa `options` yang dibutuhkan pembungkus.
  const db: Record<PeranDb, PostgresJsDatabase<typeof skema>> = {
    desa: drizzle(kolam.desa, { schema: skema }),
    kabupaten: drizzle(kolam.kabupaten, { schema: skema }),
    konsol: drizzle(kolam.konsol, { schema: skema }),
    publik: drizzle(kolam.publik, { schema: skema }),
  }
  return {
    dalamTransaksi(peran, konteks, fn) {
      return db[peran].transaction(async (tx) => {
        if (konteks.desaId !== undefined) await tx.execute(dsql`select set_config('sinfodes.desa_id', ${konteks.desaId}, true)`)
        return fn(tx)
      })
    },
    async tutup() {
      await Promise.all(Object.values(kolam).map((k) => k.end({ timeout: 5 })))
    },
  }
}
