import { describe, expect, it } from 'vitest'
import { jpegBuatan, pdfBuatan, pngBuatan, webpBuatan } from '../../test/helpers/berkas-buatan'
import { GalatBerkas, periksaBerkas } from './periksa'

const galat = (f: () => unknown): GalatBerkas => {
  try {
    f()
  } catch (e) {
    expect(e).toBeInstanceOf(GalatBerkas)
    return e as GalatBerkas
  }
  throw new Error('Seharusnya ditolak')
}
const teks = (s: string) => Buffer.from(s, 'latin1')

describe('periksaBerkas: tipe dari byte, bukan dari kiriman klien (8F3 Ruling 2)', () => {
  it('foto: JPEG, PNG, dan WebP lolos dengan ekstensi menurut isinya', () => {
    expect(periksaBerkas(jpegBuatan(), 'foto')).toEqual({ tipe: 'image/jpeg', ekstensi: '.jpg' })
    expect(periksaBerkas(pngBuatan(), 'foto')).toEqual({ tipe: 'image/png', ekstensi: '.png' })
    expect(periksaBerkas(webpBuatan(), 'foto')).toEqual({ tipe: 'image/webp', ekstensi: '.webp' })
  })

  it('PDF ditolak sebagai foto tetapi lolos sebagai pindaian; JPEG dan PNG lolos sebagai pindaian', () => {
    expect(galat(() => periksaBerkas(pdfBuatan(), 'foto')).message).toBe('Foto harus berformat JPG, PNG, atau WebP.')
    expect(periksaBerkas(pdfBuatan(), 'scan')).toEqual({ tipe: 'application/pdf', ekstensi: '.pdf' })
    expect(periksaBerkas(jpegBuatan(), 'scan').tipe).toBe('image/jpeg')
    expect(periksaBerkas(pngBuatan(), 'scan').tipe).toBe('image/png')
  })

  it('WebP ditolak sebagai pindaian (hanya PDF, JPG, PNG)', () => {
    expect(galat(() => periksaBerkas(webpBuatan(), 'scan')).message).toBe('Pindaian harus berformat PDF, JPG, atau PNG.')
  })

  it.each([
    ['HTML', teks('<!doctype html><script>alert(1)</script>')],
    ['SVG', teks('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')],
    ['GIF', teks('GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff;')],
    ['MZ (exe)', teks('MZ\x90\x00\x03\x00\x00\x00')],
    ['teks biasa', teks('ini bukan gambar')],
  ])('menyamar sebagai gambar: %s ditolak untuk foto dan pindaian', (_nama, bita) => {
    expect(galat(() => periksaBerkas(bita, 'foto')).message).toBe('Foto harus berformat JPG, PNG, atau WebP.')
    expect(galat(() => periksaBerkas(bita, 'scan')).message).toBe('Pindaian harus berformat PDF, JPG, atau PNG.')
  })

  it('berkas kosong ditolak', () => {
    expect(galat(() => periksaBerkas(Buffer.alloc(0), 'foto')).message).toBe('Berkas kosong.')
  })

  it('berkas terpotong atau berekor ditolak: JPEG tanpa FFD9, JPEG dengan ekor HTML, PNG tanpa IEND, WebP ukuran tidak cocok', () => {
    const jpeg = jpegBuatan()
    expect(galat(() => periksaBerkas(jpeg.subarray(0, jpeg.length - 2), 'foto')).message).toBe('Berkas rusak atau tidak lengkap.')
    expect(galat(() => periksaBerkas(Buffer.concat([jpeg, teks('<html><script>alert(1)</script></html>')]), 'foto')).message).toBe(
      'Berkas rusak atau tidak lengkap.',
    )
    const png = pngBuatan()
    expect(galat(() => periksaBerkas(png.subarray(0, png.length - 12), 'foto')).message).toBe('Berkas rusak atau tidak lengkap.')
    const webp = webpBuatan()
    expect(galat(() => periksaBerkas(webp.subarray(0, webp.length - 1), 'foto')).message).toBe('Berkas rusak atau tidak lengkap.')
    expect(galat(() => periksaBerkas(Buffer.concat([webp, teks('x')]), 'foto')).message).toBe('Berkas rusak atau tidak lengkap.')
  })

  it('hanya tanda tangan awal tanpa isi (FFD8FF saja, RIFF saja) ditolak', () => {
    expect(() => periksaBerkas(Buffer.from([0xff, 0xd8, 0xff]), 'foto')).toThrow(GalatBerkas)
    expect(() => periksaBerkas(teks('RIFF'), 'foto')).toThrow(GalatBerkas)
  })
})

describe('periksaBerkas: PDF aktif ditolak', () => {
  it.each(['/JavaScript (app.alert(1))', '/JS (x)', '/Launch << /F (cmd.exe) >>', '/EmbeddedFile 5 0 R', '/OpenAction 3 0 R'])('menolak %s', (tambahan) => {
    expect(galat(() => periksaBerkas(pdfBuatan(tambahan), 'scan')).message).toBe('PDF memuat konten aktif dan tidak bisa diterima.')
  })

  it('penanda yang disamarkan dengan escape #XX pada nama tetap terdeteksi', () => {
    expect(() => periksaBerkas(pdfBuatan('/Java#53cript (x)'), 'scan')).toThrow(GalatBerkas)
    expect(() => periksaBerkas(pdfBuatan('/#4Aava#53cript (x)'), 'scan')).toThrow(GalatBerkas)
  })

  it('PDF bersih lolos, termasuk nama yang diawali sama tetapi bukan penanda (/JSON tidak dihitung)', () => {
    expect(periksaBerkas(pdfBuatan(), 'scan').tipe).toBe('application/pdf')
    expect(periksaBerkas(pdfBuatan('/JSONData 1 0 R /Launcher 2 0 R'), 'scan').tipe).toBe('application/pdf')
  })

  it('pesan galat tidak memuat isi berkas', () => {
    const e = galat(() => periksaBerkas(pdfBuatan('/JavaScript (RAHASIA-XYZ-123)'), 'scan'))
    expect(e.message).not.toContain('RAHASIA')
    expect(e.message).not.toContain('JavaScript')
  })
})
