/**
 * Membuka kunci percobaan masuk: `pnpm --filter @sinfodes/api db:buka-kunci --jenis=konsol` (konsol, kabupaten, warga, panel,
 * atau semua). Dijalankan pemilik bila akun sahnya terkunci.
 */
import postgres from 'postgres'
import { GalatKonfigurasi, muatKonfigurasi } from '../src/konfigurasi'
import { bukaKunci, GalatBukaKunci, JENIS_KUNCI } from './buka-kunci'

const jenis = process.argv.find((a) => a.startsWith('--jenis='))?.slice('--jenis='.length)
if (!jenis) {
  console.error(`Pemakaian: pnpm --filter @sinfodes/api db:buka-kunci --jenis=<${JENIS_KUNCI.join('|')}>`)
  process.exit(1)
}

try {
  const konfigurasi = muatKonfigurasi(process.env)
  const sql = postgres(konfigurasi.urlDb.migrasi, { max: 1, onnotice: () => {} })
  try {
    const jumlah = await bukaKunci(sql, jenis)
    console.log(`Kunci dibuka (${jenis}): ${jumlah} baris dihapus.`)
  } finally {
    await sql.end()
  }
} catch (galat) {
  if (galat instanceof GalatBukaKunci) console.error(galat.message)
  else if (galat instanceof GalatKonfigurasi) {
    console.error('Konfigurasi bermasalah:')
    for (const m of galat.masalah) console.error(`  - ${m}`)
  } else console.error('Gagal membuka kunci:', galat instanceof Error ? galat.message : 'galat tak dikenal')
  process.exit(1)
}
