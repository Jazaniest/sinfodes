import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../test/basisdata'
import { periksaKataSandi } from '../src/kripto/kata-sandi'
import type { Penyandi } from '../src/kripto/penyandi'
import { ruang } from '../src/kripto/ruang'
import { keBase32 } from '../src/kripto/totp'
import { buatAkunTim, cetakAkunTim, GalatAkunTim } from './akun-tim'

let uji: DbUji
let penyandi: Penyandi
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
})
afterAll(async () => {
  await uji?.tutup()
})

describe('db:akun-tim (SPEC-V0.3 §8.4)', () => {
  it('membuat akun Tim Sinfodes: kata sandi di-hash argon2id, rahasia TOTP tersandi, dan semuanya dikembalikan sekali', async () => {
    const hasil = await buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'Pemilik@Sinfodes.ID', nama: 'Pemilik Sinfodes' })
    const [b] = await uji.sqlMigrasi`select * from pengguna_konsol where id = ${hasil.id}`
    expect(b).toMatchObject({ email: 'pemilik@sinfodes.id', nama: 'Pemilik Sinfodes', jabatan: 'Tim Sinfodes', peran: 'tim', aktif: true, totp_langkah_terakhir: null })
    expect(b.kata_sandi_hash).toMatch(/^\$argon2id\$/)
    expect(await periksaKataSandi(b.kata_sandi_hash, hasil.kataSandi)).toBe(true)
    expect(hasil.kataSandi.length).toBeGreaterThanOrEqual(20)
    expect(b.totp_rahasia_sandi).toMatch(/^v1\./)
    expect(b.totp_rahasia_sandi).not.toContain(hasil.rahasiaBase32)
    const rahasia = Buffer.from(penyandi.bukaSandi(b.totp_rahasia_sandi, ruang.totpKonsol), 'base64')
    expect(keBase32(rahasia)).toBe(hasil.rahasiaBase32)
    expect(hasil.urlOtpauth).toContain(hasil.rahasiaBase32)
    expect(hasil.urlOtpauth.startsWith('otpauth://totp/')).toBe(true)
  })

  it('email ganda (juga beda huruf besar) dan email tidak sah ditolak dengan pesan jelas', async () => {
    await buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'ganda@sinfodes.id', nama: 'A' })
    await expect(buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'GANDA@sinfodes.id', nama: 'B' })).rejects.toThrow(GalatAkunTim)
    await expect(buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'ganda@sinfodes.id', nama: 'B' })).rejects.toThrow('Email sudah terdaftar.')
    await expect(buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'bukan-email', nama: 'B' })).rejects.toThrow('Email tidak sah.')
    await expect(buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'ok@sinfodes.id', nama: '  ' })).rejects.toThrow('Nama wajib diisi.')
  })

  it('keluaran cetak memuat kata sandi dan kunci TOTP tepat satu kali, tanpa hash dan tanpa rahasia lain', async () => {
    const hasil = await buatAkunTim(uji.sqlMigrasi, penyandi, { email: 'cetak@sinfodes.id', nama: 'Cetak' })
    const baris: string[] = []
    cetakAkunTim(hasil, 'cetak@sinfodes.id', (b) => baris.push(b))
    const teks = baris.join('\n')
    const hitung = (cari: string) => teks.split(cari).length - 1
    expect(hitung(hasil.kataSandi)).toBe(1)
    // Kunci TOTP muncul di baris kunci dan di URL otpauth: dua kali, keduanya disengaja (ketik manual atau pindai).
    expect(hitung(hasil.rahasiaBase32)).toBe(2)
    expect(teks).toContain('cetak@sinfodes.id')
    expect(teks).not.toContain('$argon2')
    expect(teks).not.toContain('v1.')
  })
})
