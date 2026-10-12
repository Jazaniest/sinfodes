import { describe, expect, it } from 'vitest'
import { kecilkanFoto, periksaFotoAsli, type AlatGambar } from './foto'

function alatTiruan(ukuranAsli: { lebar: number; tinggi: number }, gagal = false) {
  const catatan: { gambar: [number, number, number][]; ditutup: boolean } = { gambar: [], ditutup: false }
  const alat: AlatGambar = {
    muat: async () => ({ ...ukuranAsli, sumber: {} as CanvasImageSource, tutup: () => { catatan.ditutup = true } }),
    gambar: async (_sumber, lebar, tinggi, kualitas) => {
      catatan.gambar.push([lebar, tinggi, kualitas])
      if (gagal) throw new Error('Foto tidak bisa diproses')
      return new Blob([new Uint8Array(250 * 1024)], { type: 'image/jpeg' })
    },
  }
  return { alat, catatan }
}

describe('kecilkanFoto (SPEC §10, fokus review 2)', () => {
  it('foto kamera dikecilkan ke sisi terpanjang 1600px, JPEG kualitas 0,7, berakhiran .jpg', async () => {
    const { alat, catatan } = alatTiruan({ lebar: 4032, tinggi: 3024 })
    const hasil = await kecilkanFoto(new File(['x'], 'IMG_20261012.HEIC', { type: 'image/heic' }), alat)
    expect(catatan.gambar).toEqual([[1600, 1200, 0.7]])
    expect(hasil).toMatchObject({ name: 'IMG_20261012.jpg', type: 'image/jpeg', size: 250 * 1024 })
    expect(catatan.ditutup).toBe(true)
  })
  it('foto kecil tidak diperbesar', async () => {
    const { alat, catatan } = alatTiruan({ lebar: 800, tinggi: 600 })
    await kecilkanFoto(new File(['x'], 'kecil.png', { type: 'image/png' }), alat)
    expect(catatan.gambar).toEqual([[800, 600, 0.7]])
  })
  it('foto yang gagal diproses tetap melepas gambarnya, lalu galatnya diteruskan', async () => {
    const { alat, catatan } = alatTiruan({ lebar: 4032, tinggi: 3024 }, true)
    await expect(kecilkanFoto(new File(['x'], 'rusak.jpg', { type: 'image/jpeg' }), alat)).rejects.toThrow('Foto tidak bisa diproses')
    expect(catatan.ditutup).toBe(true)
  })
  it('berkas bukan gambar atau lebih dari 15 MB ditolak sebelum diproses', () => {
    expect(periksaFotoAsli({ type: 'image/jpeg', size: 4 * 1024 * 1024 })).toBeNull()
    expect(periksaFotoAsli({ type: 'application/pdf', size: 1024 })).toBe('Pilih berkas foto (JPG, PNG, atau HEIC dari kamera).')
    expect(periksaFotoAsli({ type: 'image/jpeg', size: 16 * 1024 * 1024 })).toBe('Foto terlalu besar. Paling besar 15 MB.')
  })
})
