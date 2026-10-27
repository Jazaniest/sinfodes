import { describe, expect, it } from 'vitest'
import { hashKataSandi, periksaKataSandi, periksaTerhadapPalsu } from './kata-sandi'

describe('kata sandi (argon2id)', () => {
  it('hash diverifikasi benar dan salah', async () => {
    const hash = await hashKataSandi('kata sandi panjang yang benar')
    expect(await periksaKataSandi(hash, 'kata sandi panjang yang benar')).toBe(true)
    expect(await periksaKataSandi(hash, 'kata sandi panjang yang salah')).toBe(false)
  })

  it('hash berawalan $argon2id$ dengan parameter OWASP (m=19456, t=2, p=1)', async () => {
    const hash = await hashKataSandi('x')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(hash).toContain('m=19456,t=2,p=1')
  })

  it('kata sandi sama menghasilkan hash berbeda (garam)', async () => {
    expect(await hashKataSandi('sama')).not.toBe(await hashKataSandi('sama'))
  })

  it('hash rusak dianggap salah, bukan galat', async () => {
    expect(await periksaKataSandi('bukan-hash', 'apa saja')).toBe(false)
    expect(await periksaKataSandi('', '')).toBe(false)
  })

  it('pemeriksaan terhadap hash palsu selalu salah dan memakan waktu sebanding (dasar jawaban masuk seragam)', async () => {
    const hash = await hashKataSandi('kata sandi asli')
    await periksaTerhadapPalsu('pemanasan')
    const ukur = async (fn: () => Promise<boolean>) => {
      const mulai = performance.now()
      for (let i = 0; i < 3; i++) await fn()
      return (performance.now() - mulai) / 3
    }
    const salah = await ukur(() => periksaKataSandi(hash, 'kata sandi keliru'))
    const palsu = await ukur(() => periksaTerhadapPalsu('kata sandi keliru'))
    expect(await periksaTerhadapPalsu('kata sandi asli')).toBe(false)
    expect(palsu / salah).toBeGreaterThan(0.2)
    expect(palsu / salah).toBeLessThan(5)
  })
})
