import { DAFTAR_BUKU } from '@sinfodes/kontrak/buku/schema'
import { describe, expect, it } from 'vitest'
import { BUKU_MENUNGGU, SUSUNAN_BUKU } from '../../src/modul/buku/susunan'

describe('registri Buku Administrasi (rencana 8E3 Ruling 12)', () => {
  const bersumber = DAFTAR_BUKU.filter((b) => b.sumber !== null)

  it('setiap buku bersumber ada tepat di salah satu: punya susunan, atau menunggu sumbernya', () => {
    for (const b of bersumber) {
      const punya = b.kode in SUSUNAN_BUKU
      const menunggu = b.kode in BUKU_MENUNGGU
      expect(punya !== menunggu, `${b.kode}: harus tepat di salah satu daftar`).toBe(true)
    }
  })

  it('buku manual tidak pernah punya susunan maupun menunggu', () => {
    for (const b of DAFTAR_BUKU.filter((x) => x.sumber === null)) {
      expect(b.kode in SUSUNAN_BUKU, b.kode).toBe(false)
      expect(b.kode in BUKU_MENUNGGU, b.kode).toBe(false)
    }
  })

  it('kode yang terdaftar semuanya dikenal, dan tahap penunggu hanya 8F atau 8G', () => {
    const kode = new Set(DAFTAR_BUKU.map((b) => b.kode as string))
    for (const k of [...Object.keys(SUSUNAN_BUKU), ...Object.keys(BUKU_MENUNGGU)]) expect(kode.has(k), k).toBe(true)
    expect(new Set(Object.values(BUKU_MENUNGGU))).toEqual(new Set(['8F', '8G']))
  })

  it('tahap 8E3: lima buku punya susunan dan sepuluh menunggu', () => {
    expect(Object.keys(SUSUNAN_BUKU).sort()).toEqual(['induk-penduduk', 'ktp-kk', 'mutasi-penduduk', 'penduduk-sementara', 'rekapitulasi-penduduk'])
    expect(Object.keys(BUKU_MENUNGGU)).toHaveLength(10)
    expect(BUKU_MENUNGGU.agenda).toBe('8F')
  })
})
