import { GalatApp } from '../../galat'

/** Batas pembacaan berkas impor (rencana 8E3 Ruling 2). */
export const BATAS_IMPOR = {
  ukuranBait: 10 * 1024 * 1024,
  baris: 10_000,
  kolom: 40,
  panjangSel: 500,
  /** Jumlah ukuran terurai yang diumumkan di direktori ZIP. */
  terurai: 60 * 1024 * 1024,
  entriZip: 200,
} as const

export type EntriZip = { nama: string; ukuranTerurai: number }

const TANDA_DIREKTORI_PUSAT = 0x02014b50
const TANDA_AKHIR = 0x06054b50
const UKURAN_AKHIR = 22
const KOMENTAR_MAKS = 0xffff

const galatBerkas = (pesan: string, isian = pesan.replace(/\.$/, '')): GalatApp => new GalatApp('VALIDATION', pesan, 422, { berkas: isian })

/**
 * Entri ZIP (nama dan ukuran terurai yang diumumkan) dari direktori pusat di ujung berkas, tanpa membuka isi apa pun. Null bila
 * ini bukan ZIP yang utuh: tanda akhir tidak ada (berkas terpotong), direktori keluar dari berkas, atau memakai ZIP64.
 */
export function bacaDirektoriZip(isi: Uint8Array): EntriZip[] | null {
  if (isi.length < UKURAN_AKHIR) return null
  const dv = new DataView(isi.buffer, isi.byteOffset, isi.byteLength)
  let akhir = -1
  for (let i = isi.length - UKURAN_AKHIR; i >= Math.max(0, isi.length - UKURAN_AKHIR - KOMENTAR_MAKS); i -= 1) {
    if (dv.getUint32(i, true) === TANDA_AKHIR) {
      akhir = i
      break
    }
  }
  if (akhir < 0) return null
  const jumlah = dv.getUint16(akhir + 10, true)
  const mulai = dv.getUint32(akhir + 16, true)
  if (jumlah === 0xffff || mulai === 0xffffffff || mulai >= akhir) return null

  const nama = new TextDecoder('utf-8')
  const entri: EntriZip[] = []
  let p = mulai
  for (let n = 0; n < jumlah; n += 1) {
    if (p + 46 > akhir || dv.getUint32(p, true) !== TANDA_DIREKTORI_PUSAT) return null
    const panjangNama = dv.getUint16(p + 28, true)
    const panjangExtra = dv.getUint16(p + 30, true)
    const panjangKomentar = dv.getUint16(p + 32, true)
    if (p + 46 + panjangNama > akhir) return null
    entri.push({ nama: nama.decode(isi.subarray(p + 46, p + 46 + panjangNama)), ukuranTerurai: dv.getUint32(p + 24, true) })
    p += 46 + panjangNama + panjangExtra + panjangKomentar
  }
  return entri
}

/**
 * Menolak bom ZIP yang jujur sebelum pustaka membuka apa pun: terlalu banyak bagian, atau jumlah ukuran terurai yang diumumkan
 * melebihi batas. Ukuran yang diumumkan bisa dipalsukan, jadi ini hanya pagar pertama (lihat uji ukuran palsu).
 */
export function periksaBomZip(isi: Uint8Array): EntriZip[] {
  const entri = bacaDirektoriZip(isi)
  if (entri === null) throw galatBerkas('Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.', 'Berkas tidak terbaca')
  if (entri.length > BATAS_IMPOR.entriZip) throw galatBerkas('Isi berkas memiliki terlalu banyak bagian.')
  const total = entri.reduce((t, e) => t + e.ukuranTerurai, 0)
  if (total > BATAS_IMPOR.terurai) throw galatBerkas('Isi berkas terlalu besar setelah dibuka. Pecah menjadi beberapa berkas.')
  return entri
}

export { galatBerkas }
