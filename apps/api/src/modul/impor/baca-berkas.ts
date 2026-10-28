import { parse as urai } from 'csv-parse/sync'
import { readSheet } from 'read-excel-file/node'
import { BATAS_IMPOR, galatBerkas, periksaBomZip } from './bom-zip'

export { BATAS_IMPOR } from './bom-zip'

/** Tabel mentah berkas impor: kepala kolom dan baris data. `nomor` = posisi baris di berkas (baris 1 adalah kepala kolom). */
export type TabelBerkas = { kolom: string[]; baris: { nomor: number; sel: string[] }[] }

const TIDAK_TERBACA = (): ReturnType<typeof galatBerkas> => galatBerkas('Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.', 'Berkas tidak terbaca')
const TANDA_ZIP = [0x50, 0x4b, 0x03, 0x04]
/** Angka dengan 15 digit atau lebih: Excel hanya menyimpan 15 digit penting, jadi NIK atau nomor KK 16 digit sudah terpotong. */
const BATAS_ANGKA_PANJANG = 1e14

/** Pembungkus angka mentah dari xlsx, supaya sel bertipe angka bisa dibedakan dari sel teks. */
class AngkaMentah {
  readonly teks: string
  constructor(teks: string) {
    this.teks = teks
  }
}

type NilaiSel = string | number | boolean | Date | AngkaMentah | null | undefined

/** Satu sel xlsx menjadi teks; sel angka yang terlalu panjang mengembalikan null (pemanggil menolak berkas). */
function teksSel(nilai: NilaiSel): string | null {
  if (nilai === null || nilai === undefined) return ''
  if (nilai instanceof AngkaMentah) return Math.abs(Number(nilai.teks)) >= BATAS_ANGKA_PANJANG ? null : nilai.teks
  if (nilai instanceof Date) return nilai.toISOString().slice(0, 10)
  if (typeof nilai === 'boolean') return nilai ? 'TRUE' : 'FALSE'
  return String(nilai).trim()
}

async function barisXlsx(isi: Uint8Array): Promise<string[][]> {
  if (isi.length < TANDA_ZIP.length || TANDA_ZIP.some((b, i) => isi[i] !== b)) throw TIDAK_TERBACA()
  const entri = periksaBomZip(isi)
  if (!entri.some((e) => e.nama === 'xl/workbook.xml')) throw TIDAK_TERBACA()
  let mentah: NilaiSel[][]
  try {
    mentah = (await readSheet(Buffer.from(isi.buffer, isi.byteOffset, isi.byteLength), 1, {
      parseNumber: (teks: string) => new AngkaMentah(teks),
    } as never)) as unknown as NilaiSel[][]
  } catch {
    throw TIDAK_TERBACA()
  }
  const kepala = mentah[0]?.map((n) => teksSel(n) ?? '') ?? []
  return mentah.map((b) =>
    b.map((n, c) => {
      const t = teksSel(n)
      if (t === null) {
        throw galatBerkas(
          `Kolom "${kepala[c] || `ke-${c + 1}`}" tersimpan sebagai angka sehingga digit akhirnya terpotong oleh Excel. Ubah format kolom menjadi Teks, ketik ulang isinya, lalu unggah lagi.`,
          `Kolom ${kepala[c] || `ke-${c + 1}`} tersimpan sebagai angka`,
        )
      }
      return t
    }),
  )
}

/** UTF-8 yang sah (BOM dibuang), atau Windows-1252 bila bukan UTF-8: simpanan "CSV" Excel berbahasa Indonesia. */
function teksCsv(isi: Uint8Array): string {
  let teks: string
  try {
    teks = new TextDecoder('utf-8', { fatal: true }).decode(isi)
  } catch {
    teks = new TextDecoder('windows-1252').decode(isi)
  }
  return teks.charCodeAt(0) === 0xfeff ? teks.slice(1) : teks
}

/** Pemisah paling banyak muncul di baris kepala: titik koma, tab, atau koma (bawaan). */
function tebakPemisah(teks: string): string {
  const kepala = teks.split(/\r\n|\r|\n/, 1)[0] ?? ''
  const hitung = (p: string) => kepala.split(p).length - 1
  const kandidat = [';', '\t', ','].map((p) => [p, hitung(p)] as const).sort((a, b) => b[1] - a[1])
  return kandidat[0][1] > 0 ? kandidat[0][0] : ','
}

function barisCsv(isi: Uint8Array): string[][] {
  if (isi.length === 0 || isi.includes(0)) throw TIDAK_TERBACA()
  const teks = teksCsv(isi)
  try {
    return urai(teks, { delimiter: tebakPemisah(teks), relax_column_count: true, relax_quotes: true, skip_empty_lines: false }) as string[][]
  } catch {
    throw TIDAK_TERBACA()
  }
}

/**
 * Membaca berkas impor (.xlsx lembar pertama, atau .csv) menjadi tabel teks. Berkas dianggap masukan berbahaya (rencana 8E3
 * Ruling 2): ekstensi, ukuran, isi sebenarnya, dan bom ZIP diperiksa sebelum diurai; baris, kolom, dan panjang sel dibatasi
 * sesudahnya. Isi sel tidak pernah dievaluasi: rumus tetap teks. Semua penolakan berupa 422 berfield `berkas`.
 */
export async function bacaBerkasTabel(nama: string, isi: Uint8Array): Promise<TabelBerkas> {
  const jenis = /\.(xlsx|csv)$/i.exec(nama)?.[1].toLowerCase()
  if (!jenis) throw galatBerkas('Berkas harus .xlsx atau .csv.')
  if (isi.length > BATAS_IMPOR.ukuranBait) throw galatBerkas('Ukuran berkas maksimal 10 MB.')
  const mentah = jenis === 'xlsx' ? await barisXlsx(isi) : barisCsv(isi)

  const kepalaMentah = (mentah[0] ?? []).map((s) => s.trim())
  while (kepalaMentah.length > 0 && kepalaMentah[kepalaMentah.length - 1] === '') kepalaMentah.pop()
  const kolom = kepalaMentah
  if (kolom.length > BATAS_IMPOR.kolom) throw galatBerkas(`Berkas memuat lebih dari ${BATAS_IMPOR.kolom} kolom.`)

  const baris: TabelBerkas['baris'] = []
  mentah.slice(1).forEach((b, i) => {
    const sel = Array.from({ length: kolom.length }, (_, c) => (b[c] ?? '').trim())
    if (sel.every((s) => s === '')) return
    if (sel.some((s) => s.length > BATAS_IMPOR.panjangSel)) throw galatBerkas(`Ada sel yang lebih dari ${BATAS_IMPOR.panjangSel} karakter.`)
    if (baris.length >= BATAS_IMPOR.baris) throw galatBerkas('Berkas memuat lebih dari 10.000 baris. Bagi menjadi beberapa berkas.')
    baris.push({ nomor: i + 2, sel })
  })
  if (kolom.length === 0 || baris.length === 0) throw galatBerkas('Berkas tidak berisi data. Isi minimal satu baris di bawah kepala kolom.')
  return { kolom, baris }
}
