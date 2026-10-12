import { describe, expect, it } from 'vitest'
import { agendaSchema, artikelSchema, fotoGaleriSchema, pengumumanSchema, statusPengumuman, tampilanWebsiteSchema } from '@/domain/website/schema'
import { bangkitkanDb } from './index'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))

describe('isi website demo (SPEC §12.6, §9)', () => {
  it('12 artikel SPEC dalam 3 bulan terakhir; dua yang terbaru masih draf dan belum dibaca', () => {
    expect(db.artikel).toHaveLength(12)
    for (const a of db.artikel) expect(artikelSchema.parse(a)).toEqual(a)
    expect(db.artikel.map((a) => a.judul)).toContain('Tradisi Menumbai: Panen Madu Sialang Kembali Digelar')
    expect(db.artikel.every((a) => a.tanggal.slice(0, 10) >= '2026-06-26' && a.tanggal.slice(0, 10) < '2026-09-24')).toBe(true)
    const draf = db.artikel.filter((a) => a.status === 'draf')
    expect(draf.map((a) => [a.judul, a.dibaca])).toEqual([
      ['Festival Bono Teluk Meranti, Warga Siapkan Homestay', 0],
      ['Hasil Musrenbangdes: 5 Usulan Prioritas untuk 2027', 0],
    ])
    expect(new Set(db.artikel.map((a) => a.slug)).size).toBe(12)
    expect(new Set(db.artikel.map((a) => a.penulis))).toEqual(new Set(['Rosmiati', 'Hendri Saputra']))
  })
  it('4 pengumuman (tiga berlaku, satu berakhir) dan 5 agenda yang akan datang', () => {
    for (const p of db.pengumuman) expect(pengumumanSchema.parse(p)).toEqual(p)
    expect(db.pengumuman.map((p) => statusPengumuman(p, '2026-09-24'))).toEqual(['berlaku', 'berlaku', 'berlaku', 'berakhir'])
    expect(db.agenda).toHaveLength(5)
    for (const a of db.agenda) expect(agendaSchema.parse(a)).toEqual(a)
    expect(db.agenda.every((a) => a.tanggal > '2026-09-24')).toBe(true)
    // Sejalan dengan artikel "Penyaluran BLT Tahap III Dijadwalkan 30 September".
    expect(db.agenda.find((a) => a.judul === 'Penyaluran BLT Dana Desa Tahap III')?.tanggal).toBe('2026-09-30')
  })
  it('galeri: 15 foto rencana SPEC §9, belum tersedia sampai kurasi foto', () => {
    expect(db.galeri).toHaveLength(15)
    for (const f of db.galeri) expect(fotoGaleriSchema.parse(f)).toEqual(f)
    expect(db.galeri.every((f) => !f.tersedia && f.kredit === null)).toBe(true)
    expect(db.galeri.filter((f) => f.album === 'Pembangunan').map((f) => f.judul)).toEqual([
      'Semenisasi jalan Dusun III, progres 0%', 'Semenisasi jalan Dusun III, progres 50%', 'Semenisasi jalan Dusun III, progres 100%',
    ])
  })
  it('tampilan bawaan: Biru tinta dan Pucuk rebung, tanpa sampul dan logo', () => {
    expect(db.tampilanWebsite).toHaveLength(1)
    expect(tampilanWebsiteSchema.parse(db.tampilanWebsite[0])).toMatchObject({ aksen: 'biru-tinta', motif: 'pucuk-rebung', sampul: null, logo: null })
  })
})
