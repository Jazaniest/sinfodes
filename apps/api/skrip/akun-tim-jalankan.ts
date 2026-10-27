/**
 * Membuat akun Tim Sinfodes pertama (atau berikutnya) dengan TOTP. Dijalankan pemilik di terminalnya sendiri:
 * `pnpm --filter @sinfodes/api db:akun-tim --email=... --nama="..." [--jabatan="..."]`.
 * Kata sandi dan kunci TOTP dicetak sekali di layar ini.
 */
import postgres from 'postgres'
import { GalatKonfigurasi, muatKonfigurasi } from '../src/konfigurasi'
import { buatPenyandi } from '../src/kripto/penyandi'
import { pastikanKunciData } from '../src/semai/semai'
import { buatAkunTim, cetakAkunTim, GalatAkunTim } from './akun-tim'

const arg = (nama: string): string | undefined => process.argv.find((a) => a.startsWith(`--${nama}=`))?.slice(nama.length + 3)
const email = arg('email')
const nama = arg('nama')
if (!email || !nama) {
  console.error('Pemakaian: pnpm --filter @sinfodes/api db:akun-tim --email=orang@contoh.id --nama="Nama Lengkap" [--jabatan="Tim Sinfodes"]')
  process.exit(1)
}

try {
  const konfigurasi = muatKonfigurasi(process.env)
  const sql = postgres(konfigurasi.urlDb.migrasi, { max: 1, onnotice: () => {} })
  try {
    const kunci = await pastikanKunciData(sql, konfigurasi.kunciUtama, konfigurasi.kidAktif)
    const penyandi = buatPenyandi(konfigurasi.kunciUtama, kunci, konfigurasi.kidAktif, konfigurasi.kunciIndeks)
    const hasil = await buatAkunTim(sql, penyandi, { email, nama, jabatan: arg('jabatan') })
    cetakAkunTim(hasil, email.trim().toLowerCase(), (baris) => console.log(baris))
  } finally {
    await sql.end()
  }
} catch (galat) {
  if (galat instanceof GalatAkunTim) console.error(galat.message)
  else if (galat instanceof GalatKonfigurasi) {
    console.error('Konfigurasi bermasalah:')
    for (const m of galat.masalah) console.error(`  - ${m}`)
  } else console.error('Gagal membuat akun:', galat instanceof Error ? galat.message : 'galat tak dikenal')
  process.exit(1)
}
