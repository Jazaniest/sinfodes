import { describe, expect, it } from 'vitest'
import { aturPassphraseSchema, PESAN_PASSPHRASE_BELUM_ADA, PESAN_PASSPHRASE_SALAH, statusPassphraseSchema } from './passphrase'

const sah = { kataSandi: 'demo', passphrase: 'sialang2026' }

describe('aturPassphraseSchema (Ruling 1 tahap 8F2b)', () => {
  it('delapan karakter lolos', () => {
    expect(aturPassphraseSchema.safeParse({ kataSandi: 'demo', passphrase: '12345678' }).success).toBe(true)
    expect(aturPassphraseSchema.safeParse(sah).success).toBe(true)
  })
  it('tujuh karakter ditolak dengan pesan tetap', () => {
    const r = aturPassphraseSchema.safeParse({ kataSandi: 'demo', passphrase: '1234567' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]).toMatchObject({ path: ['passphrase'], message: 'Passphrase minimal 8 karakter.' })
  })
  it('128 karakter lolos, 129 karakter ditolak', () => {
    expect(aturPassphraseSchema.safeParse({ kataSandi: 'demo', passphrase: 'a'.repeat(128) }).success).toBe(true)
    const r = aturPassphraseSchema.safeParse({ kataSandi: 'demo', passphrase: 'a'.repeat(129) })
    expect(r.error?.issues[0]).toMatchObject({ path: ['passphrase'], message: 'Passphrase paling banyak 128 karakter.' })
  })
  it('sama dengan kata sandi akun ditolak pada field passphrase', () => {
    const r = aturPassphraseSchema.safeParse({ kataSandi: 'kata-sandi-akun', passphrase: 'kata-sandi-akun' })
    expect(r.success).toBe(false)
    expect(r.error?.issues).toContainEqual(
      expect.objectContaining({ path: ['passphrase'], message: 'Passphrase tidak boleh sama dengan kata sandi akun.' }),
    )
  })
  it('kata sandi kosong ditolak pada field kataSandi', () => {
    const r = aturPassphraseSchema.safeParse({ kataSandi: '', passphrase: 'sialang2026' })
    expect(r.error?.issues[0]).toMatchObject({ path: ['kataSandi'], message: 'Kata sandi wajib diisi' })
  })
})

describe('status dan pesan passphrase', () => {
  it('status hanya memuat diatur', () => {
    expect(statusPassphraseSchema.parse({ diatur: false })).toEqual({ diatur: false })
    expect(statusPassphraseSchema.safeParse({}).success).toBe(false)
  })
  it('pesan dipertahankan persis dari tiruan', () => {
    expect(PESAN_PASSPHRASE_SALAH).toBe('Passphrase salah. Periksa kembali, lalu coba lagi.')
    expect(PESAN_PASSPHRASE_BELUM_ADA).toBe('Anda belum menetapkan passphrase tanda tangan.')
  })
})
