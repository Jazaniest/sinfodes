// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { jalurFotoKecil, LEBAR_FOTO } from '@/domain/website/foto'
import { FOTO_DEMO } from '@sinfodes/demo/data/foto-demo'

const FOLDER = 'public/demo/foto/'

/** Lebar gambar dari penanda SOF JPEG (baseline atau progresif). */
function lebarJpeg(data: Buffer): number {
  if (data[0] !== 0xff || data[1] !== 0xd8) throw new Error('Bukan berkas JPEG')
  let i = 2
  while (i < data.length) {
    if (data[i] !== 0xff) throw new Error('Penanda JPEG rusak')
    const penanda = data[i + 1]
    if (penanda >= 0xc0 && penanda <= 0xc3) return data.readUInt16BE(i + 7)
    i += 2 + data.readUInt16BE(i + 2)
  }
  throw new Error('Penanda SOF tidak ditemukan')
}

describe('foto demo hasil kurasi (SPEC §9, K8)', () => {
  it('15 foto dari Wikimedia Commons dengan pembuat dan lisensi bebas', () => {
    expect(FOTO_DEMO).toHaveLength(15)
    expect(new Set(FOTO_DEMO.map((f) => f.berkas)).size).toBe(15)
    for (const f of FOTO_DEMO) {
      expect(f.berkas).toMatch(/^[a-z0-9-]+$/)
      expect(f.pembuat.length).toBeGreaterThan(0)
      expect(f.lisensi).toMatch(/^(CC0|CC BY(-SA)? [34]\.0)$/)
      expect(f.tautanLisensi).toMatch(/^https:\/\/creativecommons\.org\//)
    }
  })
  it('setiap foto tersedia dalam dua ukuran JPEG versi web; yang besar paling lebar 1600px (SPEC §9)', () => {
    for (const f of FOTO_DEMO) {
      const besar = readFileSync(`${FOLDER}${f.berkas}.jpg`)
      const kecil = readFileSync(`public${jalurFotoKecil(`/demo/foto/${f.berkas}.jpg`)}`)
      expect(lebarJpeg(besar)).toBeLessThanOrEqual(1600)
      expect(lebarJpeg(besar)).toBeGreaterThan(LEBAR_FOTO.kecil)
      expect(lebarJpeg(kecil)).toBeLessThanOrEqual(LEBAR_FOTO.kecil)
    }
  })
  it('KREDIT.md mencantumkan judul asli dan pembuat setiap foto', () => {
    expect(existsSync(`${FOLDER}KREDIT.md`)).toBe(true)
    const kredit = readFileSync(`${FOLDER}KREDIT.md`, 'utf8')
    for (const f of FOTO_DEMO) {
      expect(kredit).toContain(f.judulCommons)
      expect(kredit).toContain(f.pembuat)
    }
  })
})
