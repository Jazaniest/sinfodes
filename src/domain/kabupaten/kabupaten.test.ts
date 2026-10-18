import { describe, expect, it } from 'vitest'
import { bolehKabupaten, KEMAMPUAN_KABUPATEN } from './hak-akses'
import { JUMLAH_DESA_KABUPATEN } from './jumlah-desa'
import { sesiKabupatenSchema } from './schema'
import { kabupatenDariLabel } from './wilayah'

describe('kabupaten (SPEC-V0.2 §8.1)', () => {
  it('Admin punya semua kemampuan; Peninjau hanya melihat', () => {
    for (const k of KEMAMPUAN_KABUPATEN) expect(bolehKabupaten('admin', k)).toBe(true)
    expect(KEMAMPUAN_KABUPATEN.filter((k) => bolehKabupaten('peninjau', k))).toEqual(['kab.lihat'])
  })
  it('jumlah desa kabupaten mitra untuk adopsi (Wikipedia, 18 Okt 2026)', () => {
    expect(JUMLAH_DESA_KABUPATEN['14.05']).toBe(104)
    expect(JUMLAH_DESA_KABUPATEN['14.08']).toBe(122)
  })
  it('kabupaten dari label alamat', () => {
    expect(kabupatenDariLabel('kab-pelalawan')).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(kabupatenDariLabel('kab-kuantansingingi')).toEqual({ kode: '14.09', nama: 'Kuantan Singingi' })
    expect(kabupatenDariLabel('kab-antahberantah')).toBeNull()
  })
  it('sesi kabupaten hanya untuk peran Admin atau Peninjau', () => {
    const sesi = {
      jenis: 'kabupaten',
      pengguna: { id: 'x', kabupatenKode: '14.05', nama: 'A', jabatan: 'B', peran: 'admin', email: 'a@b.c', aktif: true },
      kabupaten: { kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan' },
    }
    expect(sesiKabupatenSchema.safeParse(sesi).success).toBe(true)
    expect(sesiKabupatenSchema.safeParse({ ...sesi, pengguna: { ...sesi.pengguna, peran: 'pemantau' } }).success).toBe(false)
  })
})
