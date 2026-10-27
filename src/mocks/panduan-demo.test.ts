// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SKENARIO_DEMO } from '@/features/demo/skenario'
import { KATA_SANDI_DEMO, PENGGUNA_DEMO } from './data/desa-demo'
import { PENGGUNA_KONSOL_DEMO } from './data/desa-konsol'
import { PENGGUNA_KABUPATEN_DEMO } from './data/kabupaten-demo'
import { AKUN_WARGA_DEMO } from './data/warga-demo'

/**
 * PANDUAN-DEMO.md mengikuti aplikasi (rencana Penutup v0.2, Review Focus 3): setiap akun, skenario, dan jalur yang ditulis di
 * sana diambil dari data demo dan daftar skenario, bukan dikarang.
 */
// PANDUAN-DEMO.md ada di .gitignore, jadi klon baru tidak memilikinya; ujinya dilewati di sana, bukan gagal.
const berkas = join(process.cwd(), 'PANDUAN-DEMO.md')
const ada = existsSync(berkas)
const panduan = ada ? readFileSync(berkas, 'utf-8') : ''
const jalurTampil = (jenis: string, jalur: string) => {
  const tanpaQuery = jalur.split('?')[0]
  return jenis === 'konsol' ? tanpaQuery.replace(/^\/konsol/, '') || '/' : tanpaQuery
}

describe.skipIf(!ada)('PANDUAN-DEMO.md', () => {
  it('menyebut setiap akun demo: panel desa, warga, Konsol, dan kabupaten', () => {
    for (const p of PENGGUNA_DEMO) expect(panduan, `panel ${p.email}`).toContain(p.email)
    for (const a of AKUN_WARGA_DEMO) {
      expect(panduan, `warga ${a.nama}`).toContain(a.nama)
      expect(panduan, `NIK ${a.nama}`).toContain(a.nik)
      expect(panduan, `PIN ${a.nama}`).toContain(a.pin)
    }
    for (const p of PENGGUNA_KONSOL_DEMO) expect(panduan, `Konsol ${p.email}`).toContain(p.email)
    for (const p of PENGGUNA_KABUPATEN_DEMO) expect(panduan, `kabupaten ${p.email}`).toContain(p.email)
    expect(panduan).toContain(`\`${KATA_SANDI_DEMO}\``)
    expect(panduan).toContain('sialang2026')
  })

  it('menyebut setiap judul skenario terpandu dan setiap jalur yang dibuka tombolnya', () => {
    expect(SKENARIO_DEMO).toHaveLength(7)
    for (const s of SKENARIO_DEMO) {
      expect(panduan, s.judul).toContain(s.judul)
      for (const l of s.langkah) {
        // Alamat Konsol tampil tanpa awalan /konsol di peramban (rewrite-alamat), jadi panduan menulis jalur yang terlihat.
        for (const t of l.tombol) expect(panduan, `${s.judul}: ${t.label}`).toContain(jalurTampil(t.tujuan.jenis, t.jalur))
      }
    }
  })

  it('memuat peta alamat v0.2 dan langkah hosting wildcard (SPEC-V0.2 §4.6)', () => {
    for (const bagian of [
      '*.sinfodes.localhost:5173', 'konsol.sinfodes.localhost', 'kab-pelalawan.sinfodes.localhost', 'sungaisialang.sinfodes.localhost',
      '*.demo.sinfodes.com', 'demo.sinfodes.com', 'DNS-01', 'VITE_DOMAIN_INDUK', 'VITE_DEMO', 'index.html',
    ]) {
      expect(panduan, bagian).toContain(bagian)
    }
  })

  it('tidak memakai en dash, dan tautan contohnya tidak memuat NIK', () => {
    expect(panduan).not.toContain('\u2013')
    const tautan = panduan.split('\n').filter((baris) => /https?:\/\/|\.localhost/.test(baris))
    expect(tautan.length).toBeGreaterThan(0)
    for (const baris of tautan) expect(baris, baris).not.toMatch(/nik=|\b\d{16}\b/i)
  })

  it('tidak lagi menyebut demo tahap 1 atau tiga alur', () => {
    expect(panduan).not.toMatch(/demo tahap 1|tiga alur demo/i)
  })
})
