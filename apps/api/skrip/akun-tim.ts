import { randomBytes } from 'node:crypto'
import type postgres from 'postgres'
import { hashKataSandi } from '../src/kripto/kata-sandi'
import type { Penyandi } from '../src/kripto/penyandi'
import { ruang } from '../src/kripto/ruang'
import { buatRahasiaTotp, keBase32, urlOtpauth } from '../src/kripto/totp'

/** Galat yang pesannya aman dicetak ke terminal pemilik. */
export class GalatAkunTim extends Error {
  constructor(pesan: string) {
    super(pesan)
    this.name = 'GalatAkunTim'
  }
}

export type MasukanAkunTim = { email: string; nama: string; jabatan?: string }
export type HasilAkunTim = { id: string; kataSandi: string; rahasiaBase32: string; urlOtpauth: string }

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Membuat akun Tim Sinfodes dengan TOTP (SPEC-V0.3 §8.4: tidak ada pendaftaran sendiri). Kata sandi acak dan rahasia TOTP
 * dikembalikan satu kali untuk dicetak di terminal pemilik; di basis data hanya hash argon2id dan sandi AES-GCM.
 */
export async function buatAkunTim(sql: postgres.Sql, penyandi: Penyandi, masukan: MasukanAkunTim): Promise<HasilAkunTim> {
  const email = masukan.email.trim().toLowerCase()
  if (!POLA_EMAIL.test(email) || email.length > 254) throw new GalatAkunTim('Email tidak sah.')
  const nama = masukan.nama.trim()
  if (nama === '') throw new GalatAkunTim('Nama wajib diisi.')
  if ((await sql`select 1 from pengguna_konsol where email = ${email}`).length > 0) throw new GalatAkunTim('Email sudah terdaftar.')

  const id = `kns_${randomBytes(6).toString('hex')}`
  const kataSandi = randomBytes(18).toString('base64url')
  const rahasia = buatRahasiaTotp()
  try {
    await sql`insert into pengguna_konsol (id, nama, jabatan, peran, email, aktif, kata_sandi_hash, totp_rahasia_sandi, dibuat)
      values (${id}, ${nama}, ${masukan.jabatan?.trim() || 'Tim Sinfodes'}, 'tim', ${email}, true, ${await hashKataSandi(kataSandi)},
        ${penyandi.sandikan(rahasia.toString('base64'), ruang.totpKonsol)}, now())`
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw new GalatAkunTim('Email sudah terdaftar.')
    throw e
  }
  return { id, kataSandi, rahasiaBase32: keBase32(rahasia), urlOtpauth: urlOtpauth(rahasia, email, 'Sinfodes') }
}

/** Cetak untuk pemilik: dipanggil sekali, nilainya tidak ditampilkan lagi. */
export function cetakAkunTim(hasil: HasilAkunTim, email: string, tulis: (baris: string) => void): void {
  tulis(`Akun Tim Sinfodes dibuat untuk ${email}.`)
  tulis('Catat sekarang: kata sandi dan kunci di bawah ini tidak akan ditampilkan lagi.')
  tulis(`Kata sandi : ${hasil.kataSandi}`)
  tulis(`Kunci TOTP : ${hasil.rahasiaBase32}`)
  tulis('Di aplikasi autentikator pilih "masukkan kunci setelan" (jenis berbasis waktu), lalu ketik kunci di atas.')
  tulis(`URL otpauth: ${hasil.urlOtpauth}`)
}
