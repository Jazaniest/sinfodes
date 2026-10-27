import { describe, expect, it } from 'vitest'
import { GalatKonfigurasi, muatKonfigurasi } from './konfigurasi'

const kunci = (isi: number, panjang = 32) => Buffer.alloc(panjang, isi).toString('base64')
const acak = (awal: number, panjang = 32) => Buffer.from(Array.from({ length: panjang }, (_, i) => (awal + i * 7) % 256)).toString('base64')

/** Nilai pengembangan yang lengkap dan sah. */
const lengkap = (ubah: Record<string, string | undefined> = {}): Record<string, string | undefined> => ({
  LINGKUNGAN: 'pengembangan',
  PORT: '3001',
  DOMAIN_INDUK: 'sinfodes.localhost',
  DB_URL_MIGRASI: 'postgres://sinfodes_migrasi:Zq8vK2mR9xT4@localhost:5432/sinfodes_dev',
  DB_URL_DESA: 'postgres://sinfodes_desa:Hn3wL7cP5yB1@localhost:5432/sinfodes_dev',
  DB_URL_KABUPATEN: 'postgres://sinfodes_kabupaten:Jd6sF0qA8uE2@localhost:5432/sinfodes_dev',
  DB_URL_KONSOL: 'postgres://sinfodes_konsol:Gt4gM1zX7oV9@localhost:5432/sinfodes_dev',
  DB_URL_PUBLIK: 'postgres://sinfodes_publik:Rb5kC3hY6nW0@localhost:5432/sinfodes_dev',
  KUNCI_UTAMA: acak(11),
  KUNCI_INDEKS: acak(97),
  KID_AKTIF: 'k1',
  COOKIE_AWALAN: '__Host-',
  ...ubah,
})

describe('muatKonfigurasi', () => {
  it('lolos dengan nilai pengembangan lengkap', () => {
    const k = muatKonfigurasi(lengkap())
    expect(k.lingkungan).toBe('pengembangan')
    expect(k.port).toBe(3001)
    expect(k.domainInduk).toBe('sinfodes.localhost')
    expect(k.urlDb.desa).toContain('sinfodes_desa')
    expect(k.kunciUtama).toHaveLength(32)
    expect(k.kunciIndeks).toHaveLength(32)
    expect(k.kidAktif).toBe('k1')
    expect(k.cookieAwalan).toBe('__Host-')
  })

  it('kunci yang bukan 32 bita ditolak', () => {
    expect(() => muatKonfigurasi(lengkap({ KUNCI_UTAMA: acak(11, 16) }))).toThrow(GalatKonfigurasi)
    expect(() => muatKonfigurasi(lengkap({ KUNCI_INDEKS: acak(97, 48) }))).toThrow(GalatKonfigurasi)
  })

  it('rahasia kosong ditolak, terlebih di produksi', () => {
    const produksi = { LINGKUNGAN: 'produksi', DOMAIN_INDUK: 'sinfodes.id' }
    expect(() => muatKonfigurasi(lengkap({ ...produksi, KUNCI_UTAMA: '' }))).toThrow(GalatKonfigurasi)
    expect(() => muatKonfigurasi(lengkap({ ...produksi, DB_URL_DESA: undefined }))).toThrow(GalatKonfigurasi)
    expect(() => muatKonfigurasi(lengkap({ KUNCI_INDEKS: '' }))).toThrow(GalatKonfigurasi)
  })

  it('produksi dan staging menolak nilai contoh', () => {
    for (const lingkungan of ['produksi', 'staging']) {
      const dasar = { LINGKUNGAN: lingkungan, DOMAIN_INDUK: 'sinfodes.id' }
      expect(() => muatKonfigurasi(lengkap({ ...dasar, KUNCI_UTAMA: kunci(0) }))).toThrow(GalatKonfigurasi)
      expect(() => muatKonfigurasi(lengkap({ ...dasar, KUNCI_INDEKS: kunci(65) }))).toThrow(GalatKonfigurasi)
      expect(() =>
        muatKonfigurasi(lengkap({ ...dasar, DB_URL_DESA: 'postgres://sinfodes_desa:ganti-saya@localhost:5432/sinfodes' })),
      ).toThrow(GalatKonfigurasi)
      expect(() =>
        muatKonfigurasi(lengkap({ ...dasar, DB_URL_PUBLIK: 'postgres://sinfodes_publik:changeme@localhost:5432/sinfodes' })),
      ).toThrow(GalatKonfigurasi)
    }
    // Pengembangan boleh memakai kunci seragam: itu bukan rahasia.
    expect(() => muatKonfigurasi(lengkap({ KUNCI_UTAMA: kunci(1) }))).not.toThrow()
  })

  it('produksi menolak domain lokal dan awalan cookie pengembangan', () => {
    const produksi = { LINGKUNGAN: 'produksi' }
    expect(() => muatKonfigurasi(lengkap({ ...produksi, DOMAIN_INDUK: 'sinfodes.localhost' }))).toThrow(GalatKonfigurasi)
    expect(() => muatKonfigurasi(lengkap({ ...produksi, DOMAIN_INDUK: 'sinfodes.id', COOKIE_AWALAN: '__Secure-' }))).toThrow(GalatKonfigurasi)
    expect(muatKonfigurasi(lengkap({ ...produksi, DOMAIN_INDUK: 'sinfodes.id' })).lingkungan).toBe('produksi')
    expect(muatKonfigurasi(lengkap({ COOKIE_AWALAN: '__Secure-' })).cookieAwalan).toBe('__Secure-')
  })

  it('semua masalah dilaporkan sekaligus', () => {
    try {
      muatKonfigurasi(lengkap({ PORT: 'abc', KUNCI_UTAMA: '', DB_URL_DESA: 'bukan-url', KID_AKTIF: 'K 1!' }))
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(GalatKonfigurasi)
      const masalah = (e as GalatKonfigurasi).masalah
      expect(masalah.length).toBeGreaterThanOrEqual(4)
      expect(masalah.join(' ')).toContain('PORT')
      expect(masalah.join(' ')).toContain('KUNCI_UTAMA')
      expect(masalah.join(' ')).toContain('DB_URL_DESA')
      expect(masalah.join(' ')).toContain('KID_AKTIF')
    }
  })

  it('port bukan angka atau di luar rentang ditolak', () => {
    expect(() => muatKonfigurasi(lengkap({ PORT: 'abc' }))).toThrow(GalatKonfigurasi)
    expect(() => muatKonfigurasi(lengkap({ PORT: '70000' }))).toThrow(GalatKonfigurasi)
    expect(() => muatKonfigurasi(lengkap({ PORT: '0' }))).toThrow(GalatKonfigurasi)
  })

  it('pesan galat tidak membocorkan nilai rahasia', () => {
    try {
      muatKonfigurasi(lengkap({ KUNCI_UTAMA: 'rahasia-yang-bocor-1234', DB_URL_DESA: 'postgres://u:KataSandiRahasia99@h/d bukan url' }))
      expect.unreachable()
    } catch (e) {
      const teks = (e as GalatKonfigurasi).masalah.join(' ') + (e as Error).message
      expect(teks).not.toContain('rahasia-yang-bocor-1234')
      expect(teks).not.toContain('KataSandiRahasia99')
    }
  })
})
