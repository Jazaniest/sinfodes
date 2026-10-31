/**
 * Pemeriksa isi berkas unggahan (rencana 8F3 Ruling 2): tipe ditentukan dari byte awal, bukan dari `Content-Type` atau ekstensi
 * kiriman klien, dan struktur kasar diperiksa tanpa mendekode gambar. Ini penjaga lapis, bukan pemindai virus (SPEC §12: v0.4).
 */

export type TipeBerkas = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
/** Foto syarat warga, atau pindaian surat masuk. */
export type IzinBerkas = 'foto' | 'scan'

/** Galat berkas yang siap tampil ke pengguna; pesannya tidak pernah memuat isi berkas. */
export class GalatBerkas extends Error {
  constructor(pesan: string) {
    super(pesan)
    this.name = 'GalatBerkas'
  }
}

const IZIN: Readonly<Record<IzinBerkas, readonly TipeBerkas[]>> = {
  foto: ['image/jpeg', 'image/png', 'image/webp'],
  scan: ['application/pdf', 'image/jpeg', 'image/png'],
}
const PESAN_TIPE: Readonly<Record<IzinBerkas, string>> = {
  foto: 'Foto harus berformat JPG, PNG, atau WebP.',
  scan: 'Pindaian harus berformat PDF, JPG, atau PNG.',
}
export const PESAN_BERKAS_KOSONG = 'Berkas kosong.'
export const PESAN_BERKAS_RUSAK = 'Berkas rusak atau tidak lengkap.'
const PESAN_PDF_AKTIF = 'PDF memuat konten aktif dan tidak bisa diterima.'
const EKSTENSI: Readonly<Record<TipeBerkas, string>> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }

export const TANDA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
/** Chunk IEND utuh: panjang 0, jenis, dan CRC-nya yang tetap. */
const IEND_UTUH = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])

function tipeDariByte(b: Buffer): TipeBerkas | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b.subarray(0, 8).equals(TANDA_PNG)) return 'image/png'
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  if (b.length >= 5 && b.toString('latin1', 0, 5) === '%PDF-') return 'application/pdf'
  return null
}

/** Berkas yang terpotong atau berekor ditolak: JPEG berakhir FFD9, PNG berakhir IEND, ukuran RIFF WebP cocok dengan berkas. */
function lengkap(b: Buffer, tipe: TipeBerkas): boolean {
  switch (tipe) {
    case 'image/jpeg':
      return b.length >= 4 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9
    case 'image/png':
      return b.length >= TANDA_PNG.length + IEND_UTUH.length && b.subarray(b.length - IEND_UTUH.length).equals(IEND_UTUH)
    case 'image/webp':
      return b.readUInt32LE(4) + 8 === b.length
    case 'application/pdf':
      return true
  }
}

/** Nama PDF yang memicu aksi atau membawa berkas lain. Dicocokkan sebagai nama utuh (diikuti pembatas), bukan awalan. */
const PENANDA_AKTIF = /\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction)(?=[\s/<>[\](){}%]|$)/
const ESCAPE_NAMA = /#([0-9A-Fa-f]{2})/g

/** Penanda aktif di badan PDF, termasuk yang disamarkan dengan escape `#XX` pada nama. Penanda di aliran terkompresi tidak terlihat. */
function punyaKontenAktif(b: Buffer): boolean {
  const teks = b.toString('latin1').replace(ESCAPE_NAMA, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
  return PENANDA_AKTIF.test(teks)
}

/**
 * Memeriksa isi berkas dan mengembalikan tipe serta ekstensi menurut byte. Ukuran maksimum ditegakkan pemanggil dengan
 * konstanta kontrak; di sini hanya berkas kosong yang ditolak.
 */
export function periksaBerkas(bita: Buffer, izin: IzinBerkas): { tipe: TipeBerkas; ekstensi: string } {
  if (bita.length === 0) throw new GalatBerkas(PESAN_BERKAS_KOSONG)
  const tipe = tipeDariByte(bita)
  if (tipe === null || !IZIN[izin].includes(tipe)) throw new GalatBerkas(PESAN_TIPE[izin])
  if (!lengkap(bita, tipe)) throw new GalatBerkas(PESAN_BERKAS_RUSAK)
  if (tipe === 'application/pdf' && punyaKontenAktif(bita)) throw new GalatBerkas(PESAN_PDF_AKTIF)
  return { tipe, ekstensi: EKSTENSI[tipe] }
}
