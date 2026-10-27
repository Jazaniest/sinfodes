import { describe, expect, it } from 'vitest'
import { buatRahasiaTotp, keBase32, kodeTotp, langkahDari, periksaTotp, urlOtpauth } from './totp'

/** Rahasia uji RFC 6238 (SHA-1): ASCII "12345678901234567890". */
const RAHASIA_RFC = Buffer.from('12345678901234567890')
const pada = (detik: number): Date => new Date(detik * 1000)

describe('TOTP (RFC 6238, SHA-1, 6 digit, 30 detik)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('vektor uji RFC 6238 pada detik %i memberi %s (enam digit terakhir dari kode delapan digit)', (detik, harapan) => {
    expect(kodeTotp(RAHASIA_RFC, langkahDari(pada(detik)))).toBe(harapan)
  })

  it('jendela plus minus satu langkah diterima; dua langkah ke mana pun ditolak', () => {
    const langkah = langkahDari(pada(1111111111))
    const kode = kodeTotp(RAHASIA_RFC, langkah)
    for (const geser of [-1, 0, 1]) {
      const hasil = periksaTotp(RAHASIA_RFC, kode, pada(1111111111 + geser * 30), null)
      expect(hasil, `geser ${geser}`).toEqual({ sah: true, langkah })
    }
    for (const geser of [-2, 2, 10]) expect(periksaTotp(RAHASIA_RFC, kode, pada(1111111111 + geser * 30), null).sah, `geser ${geser}`).toBe(false)
  })

  it('kode yang sama tidak bisa dipakai dua kali, dan kode langkah lebih lama sesudah langkah baru juga ditolak', () => {
    const waktu = pada(1111111111)
    const langkah = langkahDari(waktu)
    const kode = kodeTotp(RAHASIA_RFC, langkah)
    expect(periksaTotp(RAHASIA_RFC, kode, waktu, null).sah).toBe(true)
    expect(periksaTotp(RAHASIA_RFC, kode, waktu, langkah).sah).toBe(false)
    expect(periksaTotp(RAHASIA_RFC, kode, waktu, langkah - 1).sah).toBe(true)
    const lama = kodeTotp(RAHASIA_RFC, langkah - 1)
    expect(periksaTotp(RAHASIA_RFC, lama, waktu, langkah).sah).toBe(false)
  })

  it('kode yang bukan enam angka ditolak tanpa galat', () => {
    for (const salah of ['', '12345', '1234567', 'abcdef', '12 345', '０８１８０４']) {
      expect(periksaTotp(RAHASIA_RFC, salah, pada(1111111109), null).sah, salah).toBe(false)
    }
  })

  it('rahasia 20 bita dan acak; base32 sesuai RFC 4648 tanpa padding', () => {
    const a = buatRahasiaTotp()
    expect(a).toHaveLength(20)
    expect(a.equals(buatRahasiaTotp())).toBe(false)
    expect(keBase32(Buffer.from('foobar'))).toBe('MZXW6YTBOI')
    expect(keBase32(RAHASIA_RFC)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })

  it('URL otpauth memuat rahasia, penerbit, dan parameter baku', () => {
    const url = new URL(urlOtpauth(RAHASIA_RFC, 'dina@sinfodes.id', 'Sinfodes'))
    expect(url.protocol).toBe('otpauth:')
    expect(url.host).toBe('totp')
    expect(decodeURIComponent(url.pathname)).toBe('/Sinfodes:dina@sinfodes.id')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', issuer: 'Sinfodes', algorithm: 'SHA1', digits: '6', period: '30',
    })
  })
})
