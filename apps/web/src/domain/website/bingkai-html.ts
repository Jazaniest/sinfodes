/**
 * Bingkai Blok HTML tingkat Lanjut (SPEC-V0.2 11.5, 7G).
 *
 * Kode desa tidak pernah dijalankan di halaman: kode ditulis apa adanya ke dokumen `srcdoc` sebuah bingkai bersandbox
 * `allow-scripts` (tanpa `allow-same-origin`), dan bingkai dikunci CSP `default-src 'none'` sehingga tidak ada
 * penyimpanan, kuki, jaringan, maupun akses ke dokumen induk. Skrip tinggi otomatis adalah satu konstanta yang
 * ditaruh setelah kode dan tidak pernah memuat kode desa.
 */

/** Kumpulan variabel kontrak tema (`--desa-*`) untuk `:root` di dalam bingkai. */
export type VariabelBingkai = Readonly<Record<string, string>>

/** CSP bingkai (keputusan 5): tanpa sumber bawaan; hanya data URL dan foto demo untuk gambar. */
export function CSP_BINGKAI(asalMedia: string): string {
  return `default-src 'none'; img-src data: ${asalMedia}; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:`
}

/**
 * Skrip tinggi otomatis (keputusan 5): konstanta yang mengirim `{ tipe: 'sinfodes-tinggi', tinggi }` ke induk setiap
 * kali `ResizeObserver` melihat perubahan tinggi `document.documentElement`.
 */
const SKRIP_TINGGI =
  "new ResizeObserver(function(){parent.postMessage({tipe:'sinfodes-tinggi',tinggi:document.documentElement.scrollHeight},'*')}).observe(document.documentElement)"

/** Nilai variabel tema hanya memakai karakter yang aman ditulis apa adanya di dalam `<style>` (keputusan 5). */
const KARAKTER_AMAN = /[^#0-9A-Za-z.,()'" %-]/g

/** Dokumen `srcdoc` bingkai (keputusan 5): doctype dan CSP sebelum kode desa, skrip tinggi otomatis sesudahnya. */
export function srcdocBingkai(opsi: {
  kode: string
  variabelTema: VariabelBingkai
  otomatis: boolean
  asalMedia: string
}): string {
  const variabel = Object.entries(opsi.variabelTema)
    .map(([nama, nilai]) => `${nama}:${nilai.replace(KARAKTER_AMAN, '')}`)
    .join(';')
  return (
    '<!doctype html><meta charset="utf-8">' +
    `<meta http-equiv="Content-Security-Policy" content="${CSP_BINGKAI(opsi.asalMedia)}">` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>:root{${variabel}}</style>` +
    opsi.kode +
    (opsi.otomatis ? `<script>${SKRIP_TINGGI}</script>` : '')
  )
}

/**
 * Tinggi sah dari pesan `sinfodes-tinggi` (keputusan 7): hanya angka hingga yang diterima, lalu dipotong ke 40-3000 px.
 * Pesan lain — termasuk `NaN`, `Infinity`, dan string — diabaikan tanpa galat.
 */
export function tinggiDariPesan(data: unknown): number | null {
  const pesan = data as { tipe?: unknown; tinggi?: unknown } | null
  if (typeof pesan !== 'object' || pesan === null) return null
  if (pesan.tipe !== 'sinfodes-tinggi') return null
  if (typeof pesan.tinggi !== 'number' || !Number.isFinite(pesan.tinggi)) return null
  return Math.min(3000, Math.max(40, pesan.tinggi))
}
