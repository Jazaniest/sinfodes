import { describe, expect, it } from 'vitest'
import { bentukTokenSah, buatTokenSesi, hashToken } from './token'

describe('token sesi', () => {
  it('256 bit, base64url 43 karakter, tak berulang pada seribu panggilan', () => {
    const semua = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const { token } = buatTokenSesi()
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
      semua.add(token)
    }
    expect(semua.size).toBe(1000)
  })

  it('hash tetap untuk token yang sama, tidak memuat token, dan berbeda antar token', () => {
    const a = buatTokenSesi()
    const b = buatTokenSesi()
    expect(hashToken(a.token)).toBe(a.hash)
    expect(hashToken(a.token)).toBe(hashToken(a.token))
    expect(a.hash).not.toContain(a.token)
    expect(a.hash).not.toBe(b.hash)
  })

  it('bentukTokenSah menolak token yang bukan 43 karakter base64url', () => {
    expect(bentukTokenSah(buatTokenSesi().token)).toBe(true)
    for (const buruk of ['', 'abc', 'x'.repeat(44), `${'a'.repeat(42)}!`, `${'a'.repeat(42)} `]) {
      expect(bentukTokenSah(buruk)).toBe(false)
    }
  })
})
