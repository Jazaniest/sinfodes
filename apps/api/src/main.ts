import { serve } from '@hono/node-server'
import { buatApp } from './app'
import { buatKlien } from './basisdata/klien'
import { kunciData } from './basisdata/skema'
import { GalatKonfigurasi, muatKonfigurasi, type Konfigurasi } from './konfigurasi'
import { buatPenyandi } from './kripto/penyandi'
import { buatPencatat } from './log'

const log = buatPencatat((baris) => process.stdout.write(`${baris}\n`), () => new Date())

let konfigurasi: Konfigurasi
try {
  konfigurasi = muatKonfigurasi(process.env)
} catch (e) {
  if (!(e instanceof GalatKonfigurasi)) throw e
  log.galat('konfigurasi.tidak-valid', { masalah: e.masalah })
  process.exit(1)
}

// Kunci data dibaca sekali saat mulai (peran desa boleh SELECT `kunci_data`). Tanpa kunci aktif server menolak mulai.
const klien = buatKlien(konfigurasi.urlDb)
let penyandi: ReturnType<typeof buatPenyandi>
try {
  const baris = await klien.dalamTransaksi('desa', {}, (db) => db.select().from(kunciData))
  penyandi = buatPenyandi(konfigurasi.kunciUtama, baris.map((b) => ({ kid: b.kid, dibungkus: b.dibungkus })), konfigurasi.kidAktif, konfigurasi.kunciIndeks)
} catch (e) {
  log.galat('kunci.tidak-dapat-dimuat', { galat: e })
  await klien.tutup()
  process.exit(1)
}

const app = buatApp({ konfigurasi, log, waktu: () => new Date(), klien, penyandi })
// Hanya antarmuka lokal: proksi (Caddy, atau proksi Vite saat pengembangan) yang menghadap luar.
const server = serve({ fetch: app.fetch, port: konfigurasi.port, hostname: '127.0.0.1' }, (info) => {
  log.info('server.mulai', { port: info.port, lingkungan: konfigurasi.lingkungan })
})

const tutup = (): void => {
  log.info('server.berhenti')
  server.close(() => void klien.tutup().finally(() => process.exit(0)))
}
process.on('SIGINT', tutup)
process.on('SIGTERM', tutup)
