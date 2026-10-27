import { formatRupiah } from '@sinfodes/kontrak/format/angka'
import { formatTanggal } from '@sinfodes/kontrak/format/tanggal'

const keXml = (teks: string): string => teks.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Gambar slip transfer contoh untuk data demo: data URL SVG berukuran kecil dengan cap besar "CONTOH" supaya tidak ada yang
 * mengiranya bukti sungguhan. Isinya hanya yang dibutuhkan pemeriksa: bank, tanggal, pengirim, dan nominal.
 */
export function buktiContohSvg(o: { bank: string; nominal: number; tanggal: string; pengirim: string }): string {
  const baris = [
    ['Tanggal', formatTanggal(o.tanggal)],
    ['Pengirim', o.pengirim],
    ['Nominal', formatRupiah(o.nominal)],
    ['Status', 'Berhasil'],
  ]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480" font-family="Arial, Helvetica, sans-serif">
<rect width="360" height="480" fill="#fbfaf6"/>
<rect x="8" y="8" width="344" height="464" fill="none" stroke="#1d3b6b" stroke-width="1.5"/>
<text x="24" y="48" font-size="15" font-weight="700" fill="#1d3b6b">${keXml(o.bank)}</text>
<text x="24" y="68" font-size="11" fill="#555">Bukti transfer</text>
<line x1="24" y1="82" x2="336" y2="82" stroke="#bbb"/>
${baris.map(([label, nilai], i) => `<text x="24" y="${118 + i * 40}" font-size="10" fill="#666">${keXml(label)}</text>\n<text x="24" y="${134 + i * 40}" font-size="14" fill="#111">${keXml(nilai)}</text>`).join('\n')}
<text x="180" y="300" font-size="64" font-weight="700" fill="#b3261e" fill-opacity="0.28" text-anchor="middle" transform="rotate(-22 180 300)">CONTOH</text>
<text x="180" y="448" font-size="11" fill="#555" text-anchor="middle">Bukti transfer demo, bukan dokumen asli</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
