// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gayaGrup, gayaInput } from './isian/gaya'
import { rasioKontras } from './kontras'
import { kelasTombol } from './tombol/gaya-tombol'
import { pasanganKontras, TOKEN_GELAP, warna } from './tokens'

const css = readFileSync(new URL('./styles/register.css', import.meta.url), 'utf8')

describe('token warna Register', () => {
  it.each(Object.entries(warna))('--color-%s di register.css sama dengan tokens.ts', (nama, hex) => {
    const cocok = new RegExp(`--color-${nama}:\\s*(#[0-9A-Fa-f]{6});`).exec(css)
    expect(cocok?.[1]?.toUpperCase()).toBe(hex.toUpperCase())
  })

  it.each(pasanganKontras)('%s di atas %s lolos kontras minimal %d:1', (teks, latar, minimum) => {
    expect(rasioKontras(warna[teks], warna[latar])).toBeGreaterThanOrEqual(minimum)
  })
})

describe('skala layanan warga (SPEC §4.7, §10)', () => {
  const blok = /\.skala-warga,\s*\.skala-publik\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  it('di dalam .skala-warga: teks dasar 16px, kontrol dan tombol 48px (fokus review 4)', () => {
    expect(blok).toMatch(/--text-teks:\s*1rem;/)
    expect(blok).toMatch(/--text-teks-isian:\s*1rem;/)
    expect(blok).toMatch(/--spacing-kontrol:\s*3rem;/)
    expect(blok).toMatch(/--spacing-tombol:\s*3rem;/)
  })
  it('panel admin tidak berubah: isian 40px dan tombol 36px', () => {
    expect(css).toMatch(/--spacing-kontrol:\s*2\.5rem;/)
    expect(css).toMatch(/--spacing-tombol:\s*2\.25rem;/)
  })
  it('baris pilihan (radio) setinggi 48px di layanan warga, tanpa tinggi minimum di panel admin', () => {
    expect(blok).toMatch(/--spacing-pilihan:\s*3rem;/)
    expect(css).toMatch(/--spacing-pilihan:\s*0px;/)
  })
  it('isian dan tombol biasa memakai token tinggi, bukan tinggi tetap', () => {
    expect(gayaInput).toContain('h-kontrol')
    expect(gayaGrup).toContain('h-kontrol')
    expect(kelasTombol('utama', 'biasa')).toContain('h-tombol')
  })
})

describe('palet gelap Register (rencana 7E-2 Tugas 4)', () => {
  const isi = (pola: RegExp) => pola.exec(css)?.[1] ?? ''
  const blokGelap = isi(/^:root\[data-mode='gelap'\]\s*\{([^}]*)\}/m)
  const blokTerangDiSitus = isi(/^:root\[data-mode='gelap'\] \[data-situs\],\s*:root\[data-mode='gelap'\] \[data-terang\]\s*\{([^}]*)\}/m)
  const blokCetak = isi(/@media print\s*\{\s*:root\[data-mode='gelap'\]\s*\{([^}]*)\}/)
  const hexDi = (blok: string, nama: string) => new RegExp(`--color-${nama}:\\s*(#[0-9A-Fa-f]{6});`).exec(blok)?.[1]?.toUpperCase()

  it('TOKEN_GELAP memuat nama token yang sama dengan palet terang', () => {
    expect(Object.keys(TOKEN_GELAP).sort()).toEqual(Object.keys(warna).sort())
  })
  it.each(Object.entries(TOKEN_GELAP))('--color-%s di blok gelap register.css sama dengan tokens.ts', (nama, hex) => {
    expect(hexDi(blokGelap, nama)).toBe(hex.toUpperCase())
  })
  it('blok gelap menyatakan color-scheme: dark', () => {
    expect(blokGelap).toMatch(/color-scheme:\s*dark;/)
  })
  it.each(Object.entries(warna))('website, lembar cetak, dan @media print memulihkan --color-%s terang', (nama, hex) => {
    expect(hexDi(blokTerangDiSitus, nama)).toBe(hex.toUpperCase())
    expect(hexDi(blokCetak, nama)).toBe(hex.toUpperCase())
  })
  it('blok pemulihan menyatakan color-scheme: light', () => {
    expect(blokTerangDiSitus).toMatch(/color-scheme:\s*light;/)
    expect(blokCetak).toMatch(/color-scheme:\s*light;/)
  })
  it('bayangan dan tirai punya nilai gelap sendiri', () => {
    expect(blokGelap).toMatch(/--shadow-melayang:/)
    expect(blokGelap).toMatch(/--color-tirai:/)
    expect(css).toMatch(/--color-tirai:\s*rgb\(27 38 49 \/ 0\.3\);/)
  })
})
