import { describe, expect, it } from 'vitest'
import {
  bersihkanWhatsapp, formatWhatsapp, periksaPin, periksaPinBaru, periksaWhatsapp, samarkanNik,
} from './akun'
import { masukWargaSchema, ubahAkunWargaSchema } from './sesi'

describe('akun layanan warga (SPEC §10)', () => {
  it('PIN terdiri dari 6 angka', () => {
    expect(periksaPin('246810')).toBeNull()
    expect(periksaPin('24681')).toBe('PIN terdiri dari 6 angka.')
    expect(periksaPin('24681a')).toBe('PIN terdiri dari 6 angka.')
  })
  it('PIN baru yang mudah ditebak ditolak (fokus review 5)', () => {
    expect(periksaPinBaru('246810', '246810')).toBe('PIN baru harus berbeda dari PIN lama.')
    expect(periksaPinBaru('777777', '246810')).toBe('PIN tidak boleh 6 angka yang sama.')
    expect(periksaPinBaru('123456', '246810')).toBe('PIN tidak boleh angka berurutan seperti 123456.')
    expect(periksaPinBaru('543210', '246810')).toBe('PIN tidak boleh angka berurutan seperti 123456.')
    expect(periksaPinBaru('12345', '246810')).toBe('PIN terdiri dari 6 angka.')
    expect(periksaPinBaru('580317', '246810')).toBeNull()
  })
  it('nomor WhatsApp: +62 dan pemisah dibersihkan, lalu bentuknya diperiksa (fokus review 5)', () => {
    expect(bersihkanWhatsapp('+62 812-7740-2231')).toBe('081277402231')
    expect(bersihkanWhatsapp('0812 7740 2231')).toBe('081277402231')
    expect(periksaWhatsapp('081277402231')).toBeNull()
    expect(periksaWhatsapp('0812774')).toBe('Nomor WhatsApp diawali 08 dan terdiri dari 10–13 angka.')
    expect(periksaWhatsapp('0761123456')).toBe('Nomor WhatsApp diawali 08 dan terdiri dari 10–13 angka.')
    expect(formatWhatsapp('081277402231')).toBe('0812-7740-2231')
  })
  it('NIK disamarkan: hanya 4 angka terakhir yang tampil', () => {
    expect(samarkanNik('1405095203918002')).toBe('•••• •••• •••• 8002')
  })
  it('isian masuk: NIK 16 angka dan PIN 6 angka', () => {
    expect(masukWargaSchema.safeParse({ nik: '1405095203918002', pin: '246810' }).success).toBe(true)
    expect(masukWargaSchema.safeParse({ nik: '140509520391', pin: '246810' }).error?.issues[0]?.message).toBe('NIK terdiri dari 16 angka.')
    expect(masukWargaSchema.safeParse({ nik: '1405095203918002', pin: '2468' }).error?.issues[0]?.message).toBe('PIN terdiri dari 6 angka.')
  })
  it('ubah akun: harus ada yang diubah', () => {
    expect(ubahAkunWargaSchema.safeParse({}).success).toBe(false)
    expect(ubahAkunWargaSchema.safeParse({ whatsapp: '081277402231' }).success).toBe(true)
    expect(ubahAkunWargaSchema.safeParse({ pinLama: '246810', pinBaru: '580317' }).success).toBe(true)
  })
})
