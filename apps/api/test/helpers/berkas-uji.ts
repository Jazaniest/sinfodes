import { strToU8, zipSync } from 'fflate'

/** Sel xlsx uji: teks, angka (tersimpan sebagai angka), tanggal (angka berformat tanggal), atau kosong. */
export type SelUji = string | number | Date | null

const xml = (isi: string): Uint8Array => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${isi}`)
const lolos = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const kolomHuruf = (i: number): string => {
  let n = i + 1
  let h = ''
  while (n > 0) {
    h = String.fromCharCode(65 + ((n - 1) % 26)) + h
    n = Math.floor((n - 1) / 26)
  }
  return h
}
const serialExcel = (d: Date): number => (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86_400_000

/** Bagian-bagian paket xlsx minimal yang sah (satu lembar), tanpa dimampatkan; dipakai juga untuk membuat berkas rusak. */
export function bagianXlsxUji(baris: readonly (readonly SelUji[])[]): Record<string, Uint8Array> {
  const teks: string[] = []
  const indeksTeks = (t: string): number => {
    const i = teks.indexOf(t)
    if (i >= 0) return i
    teks.push(t)
    return teks.length - 1
  }
  const isiBaris = baris
    .map((b, r) => {
      const sel = b
        .map((s, c) => {
          const alamat = `${kolomHuruf(c)}${r + 1}`
          if (s === null) return ''
          if (typeof s === 'number') return `<c r="${alamat}"><v>${s}</v></c>`
          if (s instanceof Date) return `<c r="${alamat}" s="1"><v>${serialExcel(s)}</v></c>`
          return `<c r="${alamat}" t="s"><v>${indeksTeks(s)}</v></c>`
        })
        .join('')
      return `<row r="${r + 1}">${sel}</row>`
    })
    .join('')
  return {
    '[Content_Types].xml': xml(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
        '</Types>',
    ),
    '_rels/.rels': xml(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    'xl/workbook.xml': xml(
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': xml(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
        '</Relationships>',
    ),
    'xl/styles.xml': xml(
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
        '</styleSheet>',
    ),
    'xl/sharedStrings.xml': xml(
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${teks.length}" uniqueCount="${teks.length}">${teks
        .map((t) => `<si><t xml:space="preserve">${lolos(t)}</t></si>`)
        .join('')}</sst>`,
    ),
    'xl/worksheets/sheet1.xml': xml(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${isiBaris}</sheetData></worksheet>`),
  }
}

/** Berkas .xlsx uji yang sah. Sel `Date` tersimpan sebagai angka berformat tanggal, sel `number` sebagai angka. */
export function buatXlsxUji(baris: readonly (readonly SelUji[])[]): Uint8Array {
  return zipSync(bagianXlsxUji(baris))
}

export type OpsiCsvUji = { pemisah?: string; bom?: boolean; sandi?: 'utf-8' | 'windows-1252'; akhirBaris?: string }

/** Berkas .csv uji. Sel yang memuat pemisah, kutip, atau baris baru dikutip seperti yang ditulis Excel. */
export function buatCsvUji(baris: readonly (readonly string[])[], opsi: OpsiCsvUji = {}): Uint8Array {
  const pemisah = opsi.pemisah ?? ','
  const kutip = (s: string) => (/["\n\r]/.test(s) || s.includes(pemisah) ? `"${s.replace(/"/g, '""')}"` : s)
  const teks = baris.map((b) => b.map(kutip).join(pemisah)).join(opsi.akhirBaris ?? '\n')
  const isi = opsi.sandi === 'windows-1252' ? new Uint8Array(Buffer.from(teks, 'latin1')) : new TextEncoder().encode(teks)
  if (!opsi.bom) return isi
  return new Uint8Array([0xef, 0xbb, 0xbf, ...isi])
}

/** Mengubah ukuran terurai yang diumumkan di header lokal dan direktori pusat ZIP (bom ZIP dengan ukuran palsu). */
export function palsukanUkuranZip(zip: Uint8Array, ukuranPalsu: number): Uint8Array {
  const salinan = new Uint8Array(zip)
  const dv = new DataView(salinan.buffer)
  for (let i = 0; i + 4 < salinan.length; i += 1) {
    if (dv.getUint32(i, true) === 0x04034b50) dv.setUint32(i + 22, ukuranPalsu, true)
    if (dv.getUint32(i, true) === 0x02014b50) dv.setUint32(i + 24, ukuranPalsu, true)
  }
  return salinan
}
