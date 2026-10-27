import { describe, expect, it } from 'vitest'
import { bacaEnv, rencanaEnv } from './env-lokal'

let n = 0
const konteks = () => ({
  host: 'localhost',
  port: '5432',
  basisData: 'sinfodes_dev',
  sandiAcak: () => `Sandi${String(++n).padStart(3, '0')}AbCdEfGhIjKlMnOpQrSt`,
  kunciAcak: () => Buffer.alloc(32, ++n).toString('base64'),
})

describe('rencanaEnv (berkas .env.local dari db:siapkan)', () => {
  it('berkas kosong: lima URL, dua kunci, dan pengaturan bawaan', () => {
    const r = rencanaEnv({}, konteks())
    const env = bacaEnv(r.barisBaru.join('\n'))
    for (const p of ['MIGRASI', 'DESA', 'KABUPATEN', 'KONSOL', 'PUBLIK']) {
      expect(env[`DB_URL_${p}`]).toMatch(new RegExp(`^postgres://sinfodes_${p.toLowerCase()}:[A-Za-z0-9]{20,}@localhost:5432/sinfodes_dev$`))
    }
    expect(Buffer.from(env.KUNCI_UTAMA, 'base64')).toHaveLength(32)
    expect(Buffer.from(env.KUNCI_INDEKS, 'base64')).toHaveLength(32)
    expect(env.KUNCI_UTAMA).not.toBe(env.KUNCI_INDEKS)
    expect(env).toMatchObject({ LINGKUNGAN: 'pengembangan', PORT: '3001', DOMAIN_INDUK: 'sinfodes.localhost', KID_AKTIF: 'k1', COOKIE_AWALAN: '__Host-' })
    expect(r.peranBaru.map((x) => x.peran).sort()).toEqual(['desa', 'kabupaten', 'konsol', 'migrasi', 'publik'])
  })

  it('tidak menimpa nilai yang sudah ada dan tidak membuat sandi untuk peran yang URL-nya ada', () => {
    const ada = { DB_URL_DESA: 'postgres://sinfodes_desa:LamaLamaLama@localhost:5432/sinfodes_dev', KUNCI_UTAMA: 'sudah-ada', PORT: '3999' }
    const r = rencanaEnv(ada, konteks())
    const teks = r.barisBaru.join('\n')
    expect(teks).not.toContain('DB_URL_DESA=')
    expect(teks).not.toContain('KUNCI_UTAMA=')
    expect(teks).not.toContain('PORT=')
    expect(r.peranBaru.map((x) => x.peran)).not.toContain('desa')
  })

  it('dijalankan ulang atas hasilnya sendiri tidak menambah apa pun', () => {
    const pertama = rencanaEnv({}, konteks())
    const kedua = rencanaEnv(bacaEnv(pertama.barisBaru.join('\n')), konteks())
    expect(kedua.barisBaru).toEqual([])
    expect(kedua.peranBaru).toEqual([])
  })

  it('sandi peran sama dengan sandi di URL-nya (dipakai CREATE ROLE)', () => {
    const r = rencanaEnv({}, konteks())
    const env = bacaEnv(r.barisBaru.join('\n'))
    for (const { peran, kataSandi } of r.peranBaru) {
      expect(env[`DB_URL_${peran.toUpperCase()}`]).toContain(`:${kataSandi}@`)
    }
  })
})

describe('bacaEnv', () => {
  it('mengabaikan komentar dan baris kosong, membuang kutip', () => {
    expect(bacaEnv('# komentar\n\nA=1\nB="dua"\nC=\n')).toEqual({ A: '1', B: 'dua', C: '' })
  })
})
