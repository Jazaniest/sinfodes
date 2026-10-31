import { crc32, deflateSync } from 'node:zlib'

/**
 * Berkas gambar dan PDF buatan untuk uji (rencana 8F3): dibangun byte demi byte supaya uji tidak membawa berkas biner. Gambarnya
 * tidak bisa didekode piksel demi piksel, tetapi strukturnya (segmen JPEG, chunk PNG, chunk RIFF WebP) sah dan cukup untuk
 * pemeriksa isi dan pembuang metadata, yang memang tidak mendekode gambar.
 */

/** Teks yang menyamar sebagai lokasi GPS di dalam metadata; harus hilang dari berkas bersih. */
export const GPS_UJI = 'GPS-LAT-3.5833N-LON-98.6667E'

const u16 = (n: number): Buffer => Buffer.from([(n >> 8) & 0xff, n & 0xff])
const u32be = (n: number): Buffer => {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0)
  return b
}
const u32le = (n: number): Buffer => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n >>> 0)
  return b
}
const teks = (s: string): Buffer => Buffer.from(s, 'latin1')

/** Satu segmen JPEG: FF, penanda, panjang (termasuk dua byte panjang itu sendiri), isi. */
export const segmenJpeg = (penanda: number, isi: Buffer): Buffer => Buffer.concat([Buffer.from([0xff, penanda]), u16(isi.length + 2), isi])

/** Bagian entropi setelah SOS: pengisian FF00 dan penanda restart FFD0 harus tetap sama persis setelah pembersihan. */
export const ENTROPI_JPEG = Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78, 0x9a])

export type OpsiJpeg = { exif?: boolean; xmp?: boolean; komentar?: string; photoshop?: boolean; icc?: boolean }

export function jpegBuatan(o: OpsiJpeg = {}): Buffer {
  const bagian: Buffer[] = [
    Buffer.from([0xff, 0xd8]),
    segmenJpeg(0xe0, Buffer.concat([teks('JFIF\0'), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0])])),
  ]
  if (o.exif) bagian.push(segmenJpeg(0xe1, Buffer.concat([teks('Exif\0\0'), teks(`II*\0\b\0\0\0${GPS_UJI}`)])))
  if (o.xmp) bagian.push(segmenJpeg(0xe1, teks(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${GPS_UJI}</x:xmpmeta>`)))
  if (o.icc) bagian.push(segmenJpeg(0xe2, teks('ICC_PROFILE\0\x01\x01profil-warna')))
  if (o.photoshop) bagian.push(segmenJpeg(0xed, teks(`Photoshop 3.0\0${GPS_UJI}`)))
  if (o.komentar) bagian.push(segmenJpeg(0xfe, teks(o.komentar)))
  bagian.push(
    segmenJpeg(0xdb, Buffer.concat([Buffer.from([0]), Buffer.alloc(64, 1)])),
    segmenJpeg(0xc0, Buffer.from([8, 0, 16, 0, 16, 1, 1, 0x11, 0])),
    segmenJpeg(0xc4, Buffer.concat([Buffer.from([0]), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), Buffer.from([0])])),
    segmenJpeg(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    ENTROPI_JPEG,
    Buffer.from([0xff, 0xd9]),
  )
  return Buffer.concat(bagian)
}

/** Satu chunk PNG dengan CRC yang benar. */
export const chunkPng = (tipe: string, data: Buffer): Buffer => {
  const isi = Buffer.concat([teks(tipe), data])
  return Buffer.concat([u32be(data.length), isi, u32be(crc32(isi))])
}
const TANDA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** PNG 1x1 abu-abu; `tambahan` disisipkan antara IHDR dan IDAT. */
export function pngBuatan(tambahan: readonly { tipe: string; data: Buffer }[] = []): Buffer {
  const ihdr = Buffer.concat([u32be(1), u32be(1), Buffer.from([8, 0, 0, 0, 0])])
  return Buffer.concat([
    TANDA_PNG,
    chunkPng('IHDR', ihdr),
    ...tambahan.map((c) => chunkPng(c.tipe, c.data)),
    chunkPng('IDAT', deflateSync(Buffer.from([0, 0]))),
    chunkPng('IEND', Buffer.alloc(0)),
  ])
}

/** Satu chunk RIFF WebP: empat huruf, ukuran little-endian, isi, dan satu byte pengisi bila ukuran ganjil. */
export const chunkWebp = (empat: string, data: Buffer): Buffer =>
  Buffer.concat([teks(empat), u32le(data.length), data, data.length % 2 === 1 ? Buffer.alloc(1) : Buffer.alloc(0)])

/** WebP lossless 1x1 dengan chunk VP8X; bendera EXIF dan XMP di VP8X mengikuti pilihan. */
export function webpBuatan(o: { exif?: boolean; xmp?: boolean } = {}): Buffer {
  const bendera = 0x10 | (o.exif ? 0x08 : 0) | (o.xmp ? 0x04 : 0)
  const vp8x = Buffer.concat([Buffer.from([bendera, 0, 0, 0]), Buffer.from([0, 0, 0]), Buffer.from([0, 0, 0])])
  const isi = [chunkWebp('VP8X', vp8x), chunkWebp('VP8L', Buffer.from([0x2f, 0, 0, 0, 0]))]
  if (o.exif) isi.push(chunkWebp('EXIF', teks(`Exif\0\0${GPS_UJI}`)))
  if (o.xmp) isi.push(chunkWebp('XMP ', teks(`<x:xmpmeta>${GPS_UJI}</x:xmpmeta>`)))
  const badan = Buffer.concat([teks('WEBP'), ...isi])
  return Buffer.concat([teks('RIFF'), u32le(badan.length), badan])
}

/** PDF sederhana yang sah secara struktur; `tambahan` masuk ke kamus katalog (mis. `/OpenAction 3 0 R`). */
export const pdfBuatan = (tambahan = ''): Buffer =>
  teks(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R ${tambahan} >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`,
  )
