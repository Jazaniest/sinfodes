import { describe, expect, it } from 'vitest'
import { jadwalPosyandu, pengukuranSchema, posyanduSchema } from '@/domain/kesehatan/schema'
import { bangkitkanDb } from './index'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(ACUAN)

describe('kesehatan demo (SPEC §12.2, §12.6)', () => {
  it('empat posyandu, satu per dusun, sesuai nama di SPEC §12.2', () => {
    expect(db.posyandu.map((p) => [p.nama, p.dusunId])).toEqual([
      ['Posyandu Melati', 'dsn_ss_1'],
      ['Posyandu Mawar', 'dsn_ss_2'],
      ['Posyandu Kenanga', 'dsn_ss_3'],
      ['Posyandu Anggrek', 'dsn_ss_4'],
    ])
    for (const p of db.posyandu) expect(posyanduSchema.parse(p)).toEqual(p)
  })
  it('211 balita tercatat; sekitar 85% normal, sisanya perlu pemantauan atau pendek', () => {
    expect(db.pengukuranBalita).toHaveLength(211)
    const rasioNormal = db.pengukuranBalita.filter((b) => b.status === 'normal').length / 211
    expect(rasioNormal).toBeGreaterThan(0.78)
    expect(rasioNormal).toBeLessThan(0.92)
    expect(db.pengukuranBalita.some((b) => b.status === 'perlu-pemantauan')).toBe(true)
    expect(db.pengukuranBalita.some((b) => b.status === 'pendek')).toBe(true)
  })
  it('pengukuran tepat di hari posyandu dusunnya, urut, tidak sebelum lahir atau di masa depan; tinggi tidak turun', () => {
    const indeks = new Map(db.penduduk.map((p) => [p.id, p]))
    for (const b of db.pengukuranBalita) {
      const p = indeks.get(b.pendudukId)
      const aturan = db.posyandu.find((x) => x.dusunId === p?.dusunId)?.jadwal
      if (!p || !aturan) throw new Error(`Balita ${b.pendudukId} tanpa posyandu`)
      for (const u of b.pengukuran) {
        expect(pengukuranSchema.parse(u)).toEqual(u)
        expect(u.tanggal).toBe(jadwalPosyandu(aturan, u.tanggal.slice(0, 7)))
        expect(u.tanggal >= p.tanggalLahir && u.tanggal <= '2026-09-24').toBe(true)
      }
      const tanggal = b.pengukuran.map((u) => u.tanggal)
      expect(tanggal).toEqual([...tanggal].sort())
      const tinggi = b.pengukuran.map((u) => u.tinggiCm)
      expect(tinggi).toEqual([...tinggi].sort((x, y) => x - y))
      expect(b.status === null).toBe(b.pengukuran.length === 0)
    }
  })
  it('Muhammad Alif (anak Siti Rahmah) normal, dengan 12 pengukuran bulanan', () => {
    const alif = db.pengukuranBalita.find((b) => b.pendudukId === 'pdk_muhammad_alif')
    expect(alif?.status).toBe('normal')
    expect(alif?.pengukuran).toHaveLength(12)
  })
})
