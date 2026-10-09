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
  it('domain website desa dan isi QR', () => {
    expect(domainDesa('sungai-sialang')).toBe('sungaisialang.desa.id')
    expect(tautanVerifikasi('https://demo.sinfodes.id', 'sungai-sialang', 'SS-7K3M-Q9TD')).toBe(
      'https://demo.sinfodes.id/desa/sungai-sialang/verifikasi?kode=SS-7K3M-Q9TD',
    )
  })
})
