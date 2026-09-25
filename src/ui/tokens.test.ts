// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { rasioKontras } from './kontras'
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
