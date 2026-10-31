import { crc32 } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { chunkPng, ENTROPI_JPEG, GPS_UJI, jpegBuatan, pdfBuatan, pngBuatan, segmenJpeg, webpBuatan } from '../../test/helpers/berkas-buatan'
import { bersihkanMetadata } from './bersihkan'
import { GalatBerkas, periksaBerkas } from './periksa'

const isiTeks = (b: Buffer) => b.toString('latin1')
const SOS = Buffer.from([0xff, 0xda])

describe('bersihkanMetadata JPEG (8F3 Ruling 2)', () => {
  const kotor = jpegBuatan({ exif: true, xmp: true, photoshop: true, komentar: 'dari kamera Budi', icc: true })

  it('membuang EXIF dan GPS, XMP, APP13, dan komentar; tetap berawal FFD8 dan berakhir FFD9', () => {
    const bersih = bersihkanMetadata(kotor, 'image/jpeg')
    for (const kata of ['Exif', 'GPS', 'xmpmeta', 'Photoshop', 'dari kamera Budi']) expect(isiTeks(bersih), kata).not.toContain(kata)
    expect(bersih.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]))
    expect(bersih.subarray(bersih.length - 2)).toEqual(Buffer.from([0xff, 0xd9]))
    expect(bersih.length).toBeLessThan(kotor.length)
  })

  it('APP0 (JFIF) dan profil warna (APP2) tetap; byte sejak SOS identik dengan masukan', () => {
    const bersih = bersihkanMetadata(kotor, 'image/jpeg')
    expect(isiTeks(bersih)).toContain('JFIF')
    expect(isiTeks(bersih)).toContain('profil-warna')
    expect(bersih.subarray(bersih.indexOf(SOS))).toEqual(kotor.subarray(kotor.indexOf(SOS)))
    expect(bersih.includes(ENTROPI_JPEG)).toBe(true)
  })

  it('hasilnya masih lolos periksaBerkas; berkas yang sudah bersih tidak berubah', () => {
    expect(periksaBerkas(bersihkanMetadata(kotor, 'image/jpeg'), 'foto').tipe).toBe('image/jpeg')
    const polos = jpegBuatan()
    expect(bersihkanMetadata(polos, 'image/jpeg')).toEqual(polos)
  })

  it('ekor setelah EOI dibuang', () => {
    const berekor = Buffer.concat([jpegBuatan(), Buffer.from('<html>')])
    expect(bersihkanMetadata(berekor, 'image/jpeg')).toEqual(jpegBuatan())
  })

  it('segmen yang panjangnya melampaui berkas ditolak; tanpa EOI ditolak; byte liar di antara segmen ditolak', () => {
    const potong = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe1, 0x10, 0x00]), Buffer.from('pendek')])
    expect(() => bersihkanMetadata(potong, 'image/jpeg')).toThrow(GalatBerkas)
    const tanpaEoi = jpegBuatan().subarray(0, -2)
    expect(() => bersihkanMetadata(tanpaEoi, 'image/jpeg')).toThrow(GalatBerkas)
    const liar = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0x00, 0x01, 0x02]), Buffer.from([0xff, 0xd9])])
    expect(() => bersihkanMetadata(liar, 'image/jpeg')).toThrow(GalatBerkas)
  })

  it('segmen di antara dua pemindaian (JPEG progresif) ikut diperiksa: komentar di tengah dibuang, pemindaian kedua utuh', () => {
    const kedua = Buffer.concat([segmenJpeg(0xda, Buffer.from([1, 1, 0, 0, 63, 0])), Buffer.from([0xaa, 0xbb])])
    const asli = jpegBuatan()
    const tanpaEoi = asli.subarray(0, asli.length - 2)
    const progresif = Buffer.concat([tanpaEoi, segmenJpeg(0xfe, Buffer.from(`lokasi ${GPS_UJI}`)), kedua, Buffer.from([0xff, 0xd9])])
    const bersih = bersihkanMetadata(progresif, 'image/jpeg')
    expect(isiTeks(bersih)).not.toContain('GPS')
    expect(bersih.includes(kedua)).toBe(true)
  })
})

describe('bersihkanMetadata PNG', () => {
  const kotor = pngBuatan([
    { tipe: 'gAMA', data: Buffer.from([0, 1, 0x86, 0xa0]) },
    { tipe: 'tEXt', data: Buffer.from(`Comment\0${GPS_UJI}`, 'latin1') },
    { tipe: 'eXIf', data: Buffer.from(`II*\0${GPS_UJI}`, 'latin1') },
    { tipe: 'zTXt', data: Buffer.from('Software\0\0xx', 'latin1') },
    { tipe: 'iTXt', data: Buffer.from('Title\0\0\0\0\0judul', 'latin1') },
    { tipe: 'tIME', data: Buffer.from([0x07, 0xea, 10, 31, 12, 0, 0]) },
    { tipe: 'abCd', data: Buffer.from('chunk pribadi tak dikenal') },
  ])

  /** Daftar chunk (tipe, utuh) dari PNG; menguji juga CRC tiap chunk. */
  const chunkDari = (png: Buffer) => {
    const hasil: { tipe: string; crcBenar: boolean }[] = []
    for (let p = 8; p < png.length; ) {
      const panjang = png.readUInt32BE(p)
      const tipe = png.subarray(p + 4, p + 8).toString('latin1')
      const crc = png.readUInt32BE(p + 8 + panjang)
      hasil.push({ tipe, crcBenar: crc === crc32(png.subarray(p + 4, p + 8 + panjang)) >>> 0 })
      p += 12 + panjang
    }
    return hasil
  }

  it('membuang eXIf, tEXt, zTXt, iTXt, tIME, dan chunk tambahan tak dikenal; chunk sisanya utuh dengan CRC benar', () => {
    const bersih = bersihkanMetadata(kotor, 'image/png')
    expect(chunkDari(bersih)).toEqual([
      { tipe: 'IHDR', crcBenar: true },
      { tipe: 'gAMA', crcBenar: true },
      { tipe: 'IDAT', crcBenar: true },
      { tipe: 'IEND', crcBenar: true },
    ])
    expect(isiTeks(bersih)).not.toContain('GPS')
  })

  it('IEND tetap terakhir dan hasil lolos periksaBerkas; PNG bersih tidak berubah', () => {
    const bersih = bersihkanMetadata(kotor, 'image/png')
    expect(bersih.subarray(bersih.length - 12)).toEqual(chunkPng('IEND', Buffer.alloc(0)))
    expect(periksaBerkas(bersih, 'foto').tipe).toBe('image/png')
    expect(bersihkanMetadata(pngBuatan(), 'image/png')).toEqual(pngBuatan())
  })

  it('ekor setelah IEND dibuang', () => {
    expect(bersihkanMetadata(Buffer.concat([pngBuatan(), Buffer.from('<html>')]), 'image/png')).toEqual(pngBuatan())
  })

  it('chunk yang panjangnya melampaui berkas ditolak; tanpa IEND ditolak', () => {
    const png = pngBuatan()
    const rusak = Buffer.from(png)
    rusak.writeUInt32BE(0x00ffffff, 8)
    expect(() => bersihkanMetadata(rusak, 'image/png')).toThrow(GalatBerkas)
    expect(() => bersihkanMetadata(png.subarray(0, png.length - 12), 'image/png')).toThrow(GalatBerkas)
  })
})

describe('bersihkanMetadata WebP', () => {
  it('membuang chunk EXIF dan XMP, memperbarui ukuran RIFF, dan mematikan bendera EXIF dan XMP di VP8X', () => {
    const kotor = webpBuatan({ exif: true, xmp: true })
    const bersih = bersihkanMetadata(kotor, 'image/webp')
    expect(isiTeks(bersih)).not.toContain('EXIF')
    expect(isiTeks(bersih)).not.toContain('XMP ')
    expect(isiTeks(bersih)).not.toContain('GPS')
    expect(bersih.readUInt32LE(4)).toBe(bersih.length - 8)
    // RIFF(4) ukuran(4) WEBP(4) VP8X(4) ukuran(4), lalu bendera.
    expect(isiTeks(bersih.subarray(12, 16))).toBe('VP8X')
    expect(bersih[20] & 0x0c).toBe(0)
    expect(bersih[20] & 0x10).toBe(0x10)
    expect(periksaBerkas(bersih, 'foto').tipe).toBe('image/webp')
  })

  it('WebP tanpa metadata tidak berubah', () => {
    const polos = webpBuatan()
    expect(bersihkanMetadata(polos, 'image/webp')).toEqual(polos)
  })

  it('chunk yang melampaui berkas ditolak', () => {
    const rusak = Buffer.from(webpBuatan())
    rusak.writeUInt32LE(0x00ffffff, 16)
    expect(() => bersihkanMetadata(rusak, 'image/webp')).toThrow(GalatBerkas)
  })
})

describe('bersihkanMetadata PDF', () => {
  it('PDF tidak diubah', () => {
    const pdf = pdfBuatan()
    expect(bersihkanMetadata(pdf, 'application/pdf')).toEqual(pdf)
  })
})
