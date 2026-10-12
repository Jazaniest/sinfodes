// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gayaGrup, gayaInput } from './isian/gaya'
import { rasioKontras } from './kontras'
import { kelasTombol } from './tombol/gaya-tombol'
import { pasanganKontras, warna } from './tokens'

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
  const blok = /\.skala-warga\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
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
  it('isian dan tombol biasa memakai token tinggi, bukan tinggi tetap', () => {
    expect(gayaInput).toContain('h-kontrol')
    expect(gayaGrup).toContain('h-kontrol')
    expect(kelasTombol('utama', 'biasa')).toContain('h-tombol')
  })
})
