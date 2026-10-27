import { describe, expect, it } from 'vitest'
import { ALFABET_KODE, buatKodeVerifikasi, domainDesa, POLA_KODE_VERIFIKASI, tautanVerifikasi } from './verifikasi'

describe('kode verifikasi surat (SPEC §7.5)', () => {
  it('32 karakter tanpa O, 0, I, dan 1', () => {
    expect(ALFABET_KODE).toHaveLength(32)
    expect(ALFABET_KODE).not.toMatch(/[O0I1]/)
  })
  it('kode desa + dua kelompok empat karakter', () => {
    expect(buatKodeVerifikasi('SS', () => 0)).toBe('SS-AAAA-AAAA')
    expect(buatKodeVerifikasi('SS', () => 0.999999)).toBe('SS-9999-9999')
    let i = 0
    const kode = buatKodeVerifikasi('SS', () => (i++ % 32) / 32)
    expect(kode).toBe('SS-ABCD-EFGH')
    expect(kode).toMatch(POLA_KODE_VERIFIKASI)
    expect('SS-7K3M-Q9T0').not.toMatch(POLA_KODE_VERIFIKASI)
  })
  it('domain website desa dan isi QR memakai alamat subdomain desa (SPEC-V0.2 §4.4)', () => {
    expect(domainDesa('sungaisialang', 'sinfodes.com')).toBe('sungaisialang.sinfodes.com')
    expect(tautanVerifikasi('http://sungaisialang.sinfodes.localhost:5173', 'SS-7K3M-Q9TD')).toBe(
      'http://sungaisialang.sinfodes.localhost:5173/verifikasi?kode=SS-7K3M-Q9TD',
    )
  })
})
