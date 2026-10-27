/** Menerapkan migrasi SQL ke basis data yang ditunjuk DB_URL_MIGRASI (peran sinfodes_migrasi). */
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { jalankanMigrasi } from '../src/basisdata/pelari-migrasi'

const url = process.env.DB_URL_MIGRASI
if (!url) {
  console.error('DB_URL_MIGRASI belum diisi. Jalankan dulu: pnpm --filter @sinfodes/api db:siapkan')
  process.exit(1)
}

const sql = postgres(url, { max: 1, onnotice: () => {} })
try {
  const hasil = await jalankanMigrasi(sql, fileURLToPath(new URL('../migrasi', import.meta.url)))
  console.log(`Migrasi diterapkan: ${hasil.diterapkan.join(', ') || '(tidak ada)'}. Sudah ada: ${hasil.dilewati.length}.`)
} finally {
  await sql.end()
}
