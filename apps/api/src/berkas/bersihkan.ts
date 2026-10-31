import { GalatBerkas, PESAN_BERKAS_RUSAK, TANDA_PNG, type TipeBerkas } from './periksa'

/**
 * Pembuang metadata gambar (rencana 8F3 Ruling 2): lokasi GPS, tipe kamera, dan komentar tidak boleh ikut tersimpan. Berjalan di
 * atas segmen JPEG, chunk PNG, dan chunk RIFF WebP tanpa mendekode piksel; byte gambarnya disalin apa adanya. Struktur yang
 * rusak (panjang melampaui berkas, penutup hilang) ditolak. PDF tidak diubah.
 */

const rusak = () => new GalatBerkas(PESAN_BERKAS_RUSAK)

// ------------------------------------------------------------------------------------------ JPEG
/** APP1 (EXIF dan XMP), APP13 (Photoshop/IPTC), dan komentar. */
const SEGMEN_JPEG_DIBUANG = new Set([0xe1, 0xed, 0xfe])

function bersihkanJpeg(b: Buffer): Buffer {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw rusak()
  const keluar: Buffer[] = [b.subarray(0, 2)]
  let p = 2
  while (p < b.length) {
    if (b[p] !== 0xff) throw rusak()
    while (b[p + 1] === 0xff) p++ // pengisi FF sebelum penanda
    const penanda = b[p + 1]
    if (penanda === undefined) throw rusak()
    if (penanda === 0xd9) {
      keluar.push(Buffer.from([0xff, 0xd9]))
      return Buffer.concat(keluar) // ekor sesudah EOI dibuang
    }
    if (penanda === 0x01 || (penanda >= 0xd0 && penanda <= 0xd7)) {
      keluar.push(b.subarray(p, p + 2))
      p += 2
      continue
    }
    if (p + 4 > b.length) throw rusak()
    const panjang = b.readUInt16BE(p + 2)
    const akhir = p + 2 + panjang
    if (panjang < 2 || akhir > b.length) throw rusak()
    if (!SEGMEN_JPEG_DIBUANG.has(penanda)) keluar.push(b.subarray(p, akhir))
    p = akhir
    if (penanda === 0xda) {
      // Data entropi: salin sampai penanda sungguhan berikutnya (FF00 adalah pengisi, FFD0-FFD7 penanda restart).
      const mulai = p
      while (p + 1 < b.length) {
        if (b[p] === 0xff && b[p + 1] !== 0x00 && b[p + 1] !== 0xff && !(b[p + 1] >= 0xd0 && b[p + 1] <= 0xd7)) break
        p++
      }
      if (p + 1 >= b.length) throw rusak()
      keluar.push(b.subarray(mulai, p))
    }
  }
  throw rusak() // tidak bertemu EOI
}

// ------------------------------------------------------------------------------------------ PNG
/** Chunk wajib dan chunk pelengkap yang memengaruhi tampilan; semua selain itu (teks, EXIF, waktu, pribadi) dibuang. */
const CHUNK_PNG_DIPERTAHANKAN = new Set([
  'IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD', 'pHYs', 'hIST', 'sPLT', 'acTL', 'fcTL', 'fdAT',
])

function bersihkanPng(b: Buffer): Buffer {
  if (b.length < TANDA_PNG.length || !b.subarray(0, TANDA_PNG.length).equals(TANDA_PNG)) throw rusak()
  const keluar: Buffer[] = [TANDA_PNG]
  let p = TANDA_PNG.length
  let pertama = true
  while (p + 12 <= b.length) {
    const panjang = b.readUInt32BE(p)
    const akhir = p + 12 + panjang
    if (akhir > b.length) throw rusak()
    const jenis = b.toString('latin1', p + 4, p + 8)
    if (pertama && (jenis !== 'IHDR' || panjang !== 13)) throw rusak()
    pertama = false
    if (CHUNK_PNG_DIPERTAHANKAN.has(jenis)) keluar.push(b.subarray(p, akhir))
    p = akhir
    if (jenis === 'IEND') return Buffer.concat(keluar) // ekor sesudah IEND dibuang
  }
  throw rusak() // tidak bertemu IEND
}

// ------------------------------------------------------------------------------------------ WebP
const BENDERA_VP8X_EXIF = 0x08
const BENDERA_VP8X_XMP = 0x04

function bersihkanWebp(b: Buffer): Buffer {
  if (b.length < 12 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') throw rusak()
  const akhirRiff = b.readUInt32LE(4) + 8
  if (akhirRiff > b.length || akhirRiff < 12) throw rusak()
  const chunk: Buffer[] = []
  let p = 12
  while (p < akhirRiff) {
    if (p + 8 > akhirRiff) throw rusak()
    const empat = b.toString('latin1', p, p + 4)
    const ukuran = b.readUInt32LE(p + 4)
    const akhir = p + 8 + ukuran + (ukuran % 2)
    if (akhir > akhirRiff) throw rusak()
    if (empat === 'VP8X') {
      if (ukuran < 10) throw rusak()
      const salinan = Buffer.from(b.subarray(p, akhir))
      salinan[8] &= ~(BENDERA_VP8X_EXIF | BENDERA_VP8X_XMP)
      chunk.push(salinan)
    } else if (empat !== 'EXIF' && empat !== 'XMP ') {
      chunk.push(b.subarray(p, akhir))
    }
    p = akhir
  }
  const badan = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunk])
  const kepala = Buffer.alloc(8)
  kepala.write('RIFF', 0, 'latin1')
  kepala.writeUInt32LE(badan.length, 4)
  return Buffer.concat([kepala, badan])
}

/** Isi berkas tanpa metadata. Pemanggil sudah lolos `periksaBerkas`, tetapi fungsi ini tetap menolak struktur yang rusak. */
export function bersihkanMetadata(bita: Buffer, tipe: TipeBerkas): Buffer {
  switch (tipe) {
    case 'image/jpeg':
      return bersihkanJpeg(bita)
    case 'image/png':
      return bersihkanPng(bita)
    case 'image/webp':
      return bersihkanWebp(bita)
    case 'application/pdf':
      return bita
  }
}
