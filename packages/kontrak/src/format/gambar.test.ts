import { describe, expect, it } from 'vitest'
import { gambarDataUrlSchema, periksaBerkasGambar, ukuranDataUrlKb } from './gambar'

// 1364 karakter base64 = 1023 bita; 1368 karakter = 1026 bita.
const PNG_1KB = `data:image/png;base64,${'A'.repeat(1364)}`
const PNG_2KB = `data:image/png;base64,${'A'.repeat(1368)}`

describe('gambar unggahan (SPEC §8, §9)', () => {
  it('ukuran berkas asli diperkirakan dari panjang base64', () => {
    expect(ukuranDataUrlKb(PNG_1KB)).toBe(1)
    expect(ukuranDataUrlKb(PNG_2KB)).toBe(2)
  })
  it('hanya gambar dan tidak melebihi batasnya (fokus review 4)', () => {
    expect(gambarDataUrlSchema(1).safeParse(PNG_1KB).success).toBe(true)
    expect(gambarDataUrlSchema(1).safeParse(PNG_2KB).error?.issues[0].message).toBe('Ukuran gambar paling besar 1 KB.')
    expect(gambarDataUrlSchema(500).safeParse('data:text/plain;base64,QUJD').error?.issues[0].message).toBe(
      'Berkas harus gambar PNG, JPG, WebP, atau SVG.',
    )
  })
  it('berkas diperiksa sebelum dibaca', () => {
    expect(periksaBerkasGambar({ type: 'application/pdf', size: 10 }, 500)).toBe('Berkas harus gambar PNG, JPG, WebP, atau SVG.')
    expect(periksaBerkasGambar({ type: 'image/png', size: 600 * 1024 }, 500)).toBe('Ukuran gambar paling besar 500 KB.')
    expect(periksaBerkasGambar({ type: 'image/svg+xml', size: 2048 }, 500)).toBeNull()
  })
})
