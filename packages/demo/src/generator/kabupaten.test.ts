import { describe, expect, it } from 'vitest'
import { kabupatenMitraSchema, penggunaKabupatenSchema } from '@sinfodes/kontrak/kabupaten/schema'
import { DESA_ASLI_SIAK } from '../data/desa-asli-siak'
import { bangkitkanDb } from './index'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))

describe('data kabupaten demo (SPEC-V0.2 §13)', () => {
  it('dua kabupaten mitra: Pelalawan dan Siak', () => {
    expect(db.kabupatenMitra.map((k) => [k.kode, k.label])).toEqual([['14.05', 'kab-pelalawan'], ['14.08', 'kab-siak']])
    for (const k of db.kabupatenMitra) expect(kabupatenMitraSchema.parse(k)).toEqual(k)
  })
  it('tiga akun: Admin dan Peninjau Pelalawan, Admin Siak; satu Admin aktif per kabupaten', () => {
    expect(db.penggunaKabupaten.map((p) => [p.id, p.kabupatenKode, p.peran])).toEqual([
      ['kab_fajar', '14.05', 'admin'], ['kab_rosnani', '14.05', 'peninjau'], ['kab_wahyu', '14.08', 'admin'],
    ])
    for (const p of db.penggunaKabupaten) expect(penggunaKabupatenSchema.parse(p)).toEqual(p)
    for (const k of db.kabupatenMitra) {
      expect(db.penggunaKabupaten.filter((p) => p.kabupatenKode === k.kode && p.peran === 'admin' && p.aktif)).toHaveLength(1)
    }
  })
  it('nama desa fiktif di Siak tidak sama dengan 122 desa asli Siak', () => {
    expect(new Set(DESA_ASLI_SIAK).size).toBe(122)
    const asli = new Set(DESA_ASLI_SIAK.map((n) => n.toLowerCase()))
    for (const d of db.desa.filter((x) => x.kabupaten.kode === '14.08')) expect(asli.has(d.nama.toLowerCase()), d.nama).toBe(false)
  })
})
