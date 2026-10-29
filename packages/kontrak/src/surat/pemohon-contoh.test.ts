import { describe, expect, it } from 'vitest'
import { waktuIsoWib } from '../format/tanggal'
import { pendudukSchema } from '../penduduk/schema'
import { pemohonContoh } from './pemohon-contoh'

const SEKARANG = new Date('2026-09-24T03:00:00.000Z')

describe('pemohonContoh', () => {
  it('tanpa NIK, bernama "Nama Pemohon", dan membawa id desa yang diminta', () => {
    const p = pemohonContoh('desa-a', SEKARANG)
    expect(p.nik).toBeNull()
    expect(p.nama).toBe('Nama Pemohon')
    expect(p.desaId).toBe('desa-a')
  })

  it('lolos pendudukSchema', () => {
    expect(() => pendudukSchema.parse(pemohonContoh('desa-a', SEKARANG))).not.toThrow()
  })

  it('waktu dibuat dan diubah diturunkan dari "sekarang" (WIB)', () => {
    const p = pemohonContoh('desa-a', SEKARANG)
    expect(p.dibuatPada).toBe(waktuIsoWib(SEKARANG))
    expect(p.diubahPada).toBe(waktuIsoWib(SEKARANG))
  })

  it('tidak memuat deretan 16 angka maupun telepon (tidak ada data pribadi)', () => {
    const teks = JSON.stringify(pemohonContoh('desa-a', SEKARANG))
    expect(teks).not.toMatch(/\d{16}/)
    expect(pemohonContoh('desa-a', SEKARANG).telepon).toBeNull()
  })
})
