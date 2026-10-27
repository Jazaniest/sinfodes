/**
 * Mengisi basis data dengan dunia demo (desa, dusun, akun, keluarga, penduduk) lewat peran migrasi. Idempoten.
 * Opsi: `--acuan=<ISO>` menetapkan "sekarang" dunia demo (bawaan: saat ini); `--izinkan-lingkungan-nyata` wajib untuk
 * staging dan produksi. Mencetak angka saja, tidak pernah NIK, nomor KK, atau telepon.
 */
import postgres from 'postgres'
import { GalatKonfigurasi, muatKonfigurasi } from '../src/konfigurasi'
import { buatPenyandi } from '../src/kripto/penyandi'
import { GalatSemai, pastikanKunciData, semaiDunia } from '../src/semai/semai'

const argumen = process.argv.slice(2)
const nilaiAcuan = argumen.find((a) => a.startsWith('--acuan='))?.slice('--acuan='.length)
const acuan = nilaiAcuan ? new Date(nilaiAcuan) : new Date()
if (Number.isNaN(acuan.getTime())) {
  console.error('--acuan harus tanggal ISO, mis. --acuan=2026-09-24T02:00:00Z')
  process.exit(1)
}

try {
  const konfigurasi = muatKonfigurasi(process.env)
  const sql = postgres(konfigurasi.urlDb.migrasi, { max: 1, onnotice: () => {} })
  try {
    const kunci = await pastikanKunciData(sql, konfigurasi.kunciUtama, konfigurasi.kidAktif)
    const penyandi = buatPenyandi(konfigurasi.kunciUtama, kunci, konfigurasi.kidAktif, konfigurasi.kunciIndeks)
    const ringkasan = await semaiDunia(sql, penyandi, acuan, {
      lingkungan: konfigurasi.lingkungan,
      izinkanLingkunganNyata: argumen.includes('--izinkan-lingkungan-nyata'),
    })
    console.log(`Semai selesai (${konfigurasi.lingkungan}, acuan ${acuan.toISOString()}):`)
    for (const [tabel, jumlah] of Object.entries(ringkasan)) console.log(`  ${tabel}: ${jumlah}`)
  } finally {
    await sql.end()
  }
} catch (galat) {
  if (galat instanceof GalatKonfigurasi) {
    console.error('Konfigurasi bermasalah:')
    for (const m of galat.masalah) console.error(`  - ${m}`)
  } else if (galat instanceof GalatSemai) {
    console.error(galat.message)
  } else {
    console.error('Semai gagal:', galat instanceof Error ? galat.message : 'galat tak dikenal')
  }
  process.exit(1)
}
