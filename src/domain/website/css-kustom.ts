/**
 * Pemeriksa dan pengurung CSS kustom (rencana 7G Tugas 1, SPEC-V0.2 §11.5).
 *
 * CSS desa ditolak bila melanggar daftar larangan (dengan nomor baris), lalu semua selektornya dibungkus ke
 * lingkup wadah `[data-situs-kustom]` supaya tidak mengenai toolbar demo dan komponen sistem. Hasil kurungan
 * (`terlingkup`) disimpan ke versi situs, jadi website publik tidak perlu memuat parser.
 *
 * Ruling tahap ini:
 * - `MasalahCss.pesan` sudah berupa pesan tampilan lengkap (`Baris {b}: …`), kecuali pesan ukuran yang tanpa baris.
 * - Selektor `html`, `body`, dan `:root` (termasuk di dalam `:is()`/`:where()`) merujuk wadah lingkup, dan tidak
 *   diberi awalan ganda, supaya mis. `body { display: none }` benar-benar menyembunyikan isi website.
 * - Di dalam `@font-face` `src`, `url()` diizinkan untuk huruf data (`data:font/…`) selain gambar data dan foto
 *   media desa; `local()` selalu diizinkan.
 * - `url(#…)` (rujukan fragmen) ditolak: yang diizinkan hanya gambar data, foto media desa, dan huruf data.
 * - String di dalam `image-set()`, `image()`, `src()`, dan `cross-fade()` diperiksa seperti `url()`, karena fungsi itu
 *   memuat gambar dari string tanpa `url()`.
 * - Kata `behavior` ditolak hanya sebagai kata sendiri, supaya `scroll-behavior` dan `overscroll-behavior` tetap sah.
 */
import type { Block, CssNode, List, PseudoClassSelector, Selector, SelectorList, StyleSheet } from 'css-tree'
import { periksaWarnaTema } from './kontras'

type Pohon = typeof import('css-tree')

let pohon: Pohon | null = null

/** Parser css-tree hanya dimuat lewat `import()`, tidak di chunk awal (keputusan teknis 7G). */
async function muatPohon(): Promise<Pohon> {
  pohon ??= await import('css-tree')
  return pohon
}

export const BATAS_CSS = 50 * 1024
export const ATRIBUT_LINGKUP = 'data-situs-kustom'
export const LINGKUP = `:where([${ATRIBUT_LINGKUP}])`

/**
 * Pola foto media desa yang diizinkan jadi sumber `url()` di demo (keputusan 1): jalur foto kurasi
 * `/demo/foto/….jpg`. Dipakai pemeriksaan server dan sub-tab Kode.
 */
export const POLA_MEDIA = /^\/demo\/foto\/[a-z0-9-]+\.jpg$/i

/** Satu pesan pemeriksaan CSS. `pesan` adalah pesan tampilan lengkap; `baris` dipakai tautan "Baris {b}". */
export type MasalahCss = { baris: number; pesan: string }

export type HasilPeriksaCss = { masalah: MasalahCss[]; peringatan: MasalahCss[]; terlingkup: string | null }

export const KATA_TERLARANG = ['expression(', 'behavior', '-moz-binding', 'javascript:'] as const

const POLA_URL = /\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)"']*))\s*\)/gi
const POLA_DATA_GAMBAR = /^data:image\/(?:png|jpeg|webp|svg\+xml)[;,]/i
const POLA_DATA_HURUF = /^data:(?:font\/|application\/(?:font-|x-font-))/i
const POLA_SKEMA = /^[a-z][a-z0-9+.-]*:/i
const POLA_HEX = /^#[0-9a-f]{6}$/i
const VARIABEL_KONTRAK_YANG_DIPERIKSA = ['--desa-warna-utama', '--desa-warna-aksen', '--desa-latar'] as const

/** Menghilangkan `..` dan `.` pada jalur, tetapi tidak menambah atau mengurangi garis miring. */
export function normalkanJalur(jalur: string): string {
  const absolut = jalur.startsWith('/')
  const tumpuk: string[] = []
  for (const segmen of jalur.split('/')) {
    if (segmen === '' || segmen === '.') continue
    if (segmen === '..') {
      tumpuk.pop()
      continue
    }
    tumpuk.push(segmen)
  }
  return (absolut ? '/' : '') + tumpuk.join('/')
}

function pembuatBaris(css: string): (offset: number) => number {
  const awal = [0]
  for (let i = 0; i < css.length; i++) if (css[i] === '\n') awal.push(i + 1)
  return (offset) => {
    let b = awal.length - 1
    while (b > 0 && awal[b] > offset) b--
    return b + 1
  }
}

/** Mengganti isi komentar dengan spasi (baris baru dipertahankan) supaya panjang dan nomor baris tetap. */
function buangKomentar(css: string): string {
  const hasil = css.split('')
  let i = 0
  let kutip: string | null = null
  while (i < css.length) {
    const c = css[i]
    if (kutip) {
      if (c === '\\') i += 2
      else {
        if (c === kutip) kutip = null
        i++
      }
      continue
    }
    if (c === '"' || c === "'") {
      kutip = c
      i++
      continue
    }
    if (c === '/' && css[i + 1] === '*') {
      const akhir = css.indexOf('*/', i + 2)
      const batas = akhir === -1 ? css.length : akhir + 2
      for (let j = i; j < batas; j++) if (hasil[j] !== '\n') hasil[j] = ' '
      i = batas
      continue
    }
    i++
  }
  return hasil.join('')
}

/** `behavior` hanya ditolak sebagai kata sendiri; `scroll-behavior` dan `overscroll-behavior` adalah properti sah. */
const KATA_SEBAGAI_BAGIAN_NAMA = /[a-z0-9_-]/

function cekKataTerlarang(teks: string, baris: (offset: number) => number): MasalahCss[] {
  const hasil: MasalahCss[] = []
  const turun = teks.toLowerCase()
  for (const kata of KATA_TERLARANG) {
    for (let dari = turun.indexOf(kata); dari !== -1; dari = turun.indexOf(kata, dari + kata.length)) {
      if (kata === 'behavior' && dari > 0 && KATA_SEBAGAI_BAGIAN_NAMA.test(turun[dari - 1])) continue
      const b = baris(dari)
      hasil.push({ baris: b, pesan: `Baris ${b}: "${kata}" tidak diizinkan.` })
    }
  }
  return hasil
}

function cekTandaMiring(teks: string, baris: (offset: number) => number): MasalahCss[] {
  const hasil: MasalahCss[] = []
  for (let i = teks.indexOf('\\'); i !== -1; i = teks.indexOf('\\', i + 1)) {
    const b = baris(i)
    hasil.push({ baris: b, pesan: `Baris ${b}: tanda \\ tidak diizinkan.` })
  }
  return hasil
}

function urlDiizinkan(nilai: string, polaMedia: RegExp, hurufData: boolean): boolean {
  const u = nilai.trim()
  if (u.toLowerCase().startsWith('data:')) return POLA_DATA_GAMBAR.test(u) || (hurufData && POLA_DATA_HURUF.test(u))
  if (POLA_SKEMA.test(u) || u.startsWith('//')) return false
  return polaMedia.test(normalkanJalur(u.split(/[?#]/)[0]))
}

type Rentang = { mulai: number; selesai: number }

/** Nilai `src` pada `@font-face` (Rentang offset di teks CSS asli), tempat `url()` boleh memuat huruf data. */
function rentangSrcFontFace(ast: CssNode, tree: Pohon): Rentang[] {
  const hasil: Rentang[] = []
  tree.walk(ast, (n) => {
    if (n.type !== 'Atrule' || n.name.toLowerCase() !== 'font-face' || !n.block) return
    n.block.children.forEach((d) => {
      if (d.type === 'Declaration' && d.property.toLowerCase() === 'src' && d.value.loc) {
        hasil.push({ mulai: d.value.loc.start.offset, selesai: d.value.loc.end.offset })
      }
    })
  })
  return hasil
}

function cekUrl(teks: string, baris: (offset: number) => number, polaMedia: RegExp, rentangFont: Rentang[]): MasalahCss[] {
  const hasil: MasalahCss[] = []
  for (const cocok of teks.matchAll(new RegExp(POLA_URL.source, 'gi'))) {
    const offset = cocok.index ?? 0
    const nilai = cocok[1] ?? cocok[2] ?? cocok[3] ?? ''
    const diFont = rentangFont.some((r) => offset >= r.mulai && offset < r.selesai)
    if (urlDiizinkan(nilai, polaMedia, diFont)) continue
    const b = baris(offset)
    hasil.push({
      baris: b,
      pesan: diFont ? `Baris ${b}: @font-face hanya boleh memakai huruf data atau local().` : `Baris ${b}: url() hanya boleh ke gambar data atau foto media desa ini.`,
    })
  }
  return hasil
}

const POLA_FUNGSI_GAMBAR = /(?<![a-z0-9_])(?:image-set|image|src|cross-fade)\(/gi
const POLA_STRING = /"([^"]*)"|'([^']*)'/g
const POLA_TYPE = /\btype\(\s*(?:"[^"]*"|'[^']*')\s*\)/gi

/** Isi kurung sebuah fungsi mulai dari `mulai` (indeks setelah `(`) sampai kurung penutup yang berpasangan. */
function isiFungsi(teks: string, mulai: number): string {
  let dalam = 1
  let kutip: string | null = null
  for (let i = mulai; i < teks.length; i++) {
    const c = teks[i]
    if (kutip) {
      if (c === kutip) kutip = null
    } else if (c === '"' || c === "'") kutip = c
    else if (c === '(') dalam++
    else if (c === ')' && --dalam === 0) return teks.slice(mulai, i)
  }
  return teks.slice(mulai)
}

/**
 * `image-set()`, `image()`, `src()`, dan `cross-fade()` menerima alamat gambar sebagai string tanpa `url()`; string itu
 * diperiksa dengan aturan yang sama supaya bukan jalan keluar dari larangan `url()` ke alamat luar. `url()` di dalamnya
 * sudah diperiksa `cekUrl`, dan `type("image/png")` bukan alamat.
 */
function cekFungsiGambar(teks: string, baris: (offset: number) => number, polaMedia: RegExp): MasalahCss[] {
  const hasil: MasalahCss[] = []
  for (const cocok of teks.matchAll(POLA_FUNGSI_GAMBAR)) {
    const mulai = (cocok.index ?? 0) + cocok[0].length
    const isi = isiFungsi(teks, mulai)
      .replace(new RegExp(POLA_URL.source, 'gi'), (m) => ' '.repeat(m.length))
      .replace(POLA_TYPE, (m) => ' '.repeat(m.length))
    for (const s of isi.matchAll(POLA_STRING)) {
      if (urlDiizinkan(s[1] ?? s[2] ?? '', polaMedia, false)) continue
      const b = baris(mulai + (s.index ?? 0))
      hasil.push({ baris: b, pesan: `Baris ${b}: url() hanya boleh ke gambar data atau foto media desa ini.` })
    }
  }
  return hasil
}

function cekAtrule(ast: CssNode, tree: Pohon): MasalahCss[] {
  const hasil: MasalahCss[] = []
  tree.walk(ast, (n) => {
    if (n.type !== 'Atrule') return
    const nama = n.name.toLowerCase()
    const b = n.loc?.start.line ?? 1
    if (nama === 'import') hasil.push({ baris: b, pesan: `Baris ${b}: @import tidak diizinkan.` })
    else if (nama === 'namespace' || nama === 'page') hasil.push({ baris: b, pesan: `Baris ${b}: @${nama} tidak diizinkan.` })
    else if (/(?:^|-)keyframes$/.test(nama)) {
      const namaAnimasi = (n.prelude ? tree.generate(n.prelude) : '').trim().replace(/^["']|["']$/g, '')
      if (!namaAnimasi.startsWith('desa-')) hasil.push({ baris: b, pesan: `Baris ${b}: nama @keyframes harus diawali desa-.` })
    }
  })
  return hasil
}

export type NilaiKontrak = { hex: string; baris: number }

/**
 * Peringatan kontras (bukan penolakan) untuk variabel kontrak yang diubah di aturan lingkup akar.
 * Pemeriksaan hanya dijalankan bila semua nilai yang dibutuhkan sebuah pemeriksaan ikut diubah (keputusan 3).
 * `baris` menunjuk deklarasi variabel utama pemeriksaan itu.
 */
export function peringatanKontras(ubah: { warnaUtama?: NilaiKontrak; warnaAksen?: NilaiKontrak; latar?: NilaiKontrak }): MasalahCss[] {
  const PUTIH = '#FFFFFF'
  const hasil = periksaWarnaTema({
    warnaUtama: ubah.warnaUtama?.hex ?? PUTIH,
    warnaAksen: ubah.warnaAksen?.hex ?? PUTIH,
    latar: ubah.latar?.hex ?? PUTIH,
  })
  const butuh: Record<(typeof hasil)[number]['kunci'], readonly ('warnaUtama' | 'warnaAksen' | 'latar')[]> = {
    'utama-latar': ['warnaUtama', 'latar'],
    'putih-utama': ['warnaUtama'],
    'aksen-latar': ['warnaAksen', 'latar'],
  }
  const pesan: MasalahCss[] = []
  for (const p of hasil) {
    if (p.lolos || !p.pesan) continue
    const variabel = butuh[p.kunci]
    if (!variabel.every((v) => ubah[v])) continue
    const b = ubah[variabel[0]]!.baris
    pesan.push({ baris: b, pesan: `Baris ${b}: ${p.pesan}` })
  }
  return pesan
}

function nilaiKontrakDiubah(ast: CssNode, tree: Pohon): { warnaUtama?: NilaiKontrak; warnaAksen?: NilaiKontrak; latar?: NilaiKontrak } {
  const ubah: { warnaUtama?: NilaiKontrak; warnaAksen?: NilaiKontrak; latar?: NilaiKontrak } = {}
  tree.walk(ast, (n) => {
    if (n.type !== 'Rule') return
    const prelude = n.prelude as SelectorList
    let akar = true
    prelude.children.forEach((sel) => {
      if (lingkupSelektor(tree, tree.generate(sel)) !== LINGKUP) akar = false
    })
    if (!akar) return
    ;(n.block as Block).children.forEach((d: CssNode) => {
      if (d.type !== 'Declaration') return
      const kunci = VARIABEL_KONTRAK_YANG_DIPERIKSA.indexOf(d.property as (typeof VARIABEL_KONTRAK_YANG_DIPERIKSA)[number])
      if (kunci === -1) return
      const hex = tree.generate(d.value).trim()
      if (!POLA_HEX.test(hex)) return
      const nama = (['warnaUtama', 'warnaAksen', 'latar'] as const)[kunci]
      ubah[nama] = { hex, baris: d.loc?.start.line ?? 1 }
    })
  })
  return ubah
}

type Gantian = { mulai: number; selesai: number }

function argumenPseudo(p: PseudoClassSelector): Selector[] {
  const hasil: Selector[] = []
  const kumpul = (n: unknown): void => {
    const node = n as { type?: string; children?: unknown; forEach?: (f: (x: unknown) => void) => void } | null
    if (!node || typeof node !== 'object') return
    if (node.type === 'Selector') {
      hasil.push(node as unknown as Selector)
      return
    }
    if (node.type === 'SelectorList') {
      const daftar = node as unknown as SelectorList
      daftar.children.forEach((s) => kumpul(s))
      return
    }
    if (typeof node.forEach === 'function') {
      node.forEach((s) => kumpul(s))
      return
    }
    if (node.children) kumpul(node.children)
  }
  kumpul(p.children)
  return hasil
}

/** Mengubah `html`, `body`, dan `:root` menjadi wadah lingkup. 'akar' = selektor hanya menunjuk wadah itu. */
function ubahAnak(tree: Pohon, anak: CssNode, ganti: Gantian[]): 'akar' | 'lain' {
  if (!anak.loc) return 'lain'
  if (anak.type === 'TypeSelector') {
    const nama = (anak.name ?? '').toLowerCase()
    if (nama !== 'html' && nama !== 'body') return 'lain'
    ganti.push({ mulai: anak.loc.start.offset, selesai: anak.loc.end.offset })
    return 'akar'
  }
  if (anak.type === 'PseudoClassSelector') {
    const p = anak as PseudoClassSelector
    const nama = (p.name ?? '').toLowerCase()
    if (nama === 'root' && !p.children) {
      ganti.push({ mulai: anak.loc.start.offset, selesai: anak.loc.end.offset })
      return 'akar'
    }
    const args = argumenPseudo(p)
    const hasil = args.map((a) => ubahSelektor(tree, a, ganti))
    const semuaAkhir = args.length > 0 && hasil.every((h) => h === 'akar')
    if (semuaAkhir && (nama === 'is' || nama === 'where')) {
      const mulai = anak.loc.start.offset
      const selesai = anak.loc.end.offset
      for (let i = ganti.length - 1; i >= 0; i--) if (ganti[i].mulai >= mulai && ganti[i].selesai <= selesai) ganti.splice(i, 1)
      ganti.push({ mulai, selesai })
      return 'akar'
    }
  }
  return 'lain'
}

function ubahSelektor(tree: Pohon, sel: Selector, ganti: Gantian[]): 'akar' | 'lain' {
  let semuaAkhir = true
  sel.children.forEach((anak) => {
    if (ubahAnak(tree, anak, ganti) !== 'akar') semuaAkhir = false
  })
  return semuaAkhir ? 'akar' : 'lain'
}

function lipatJangkar(teks: string): string {
  const pola = new RegExp(`${LINGKUP.replace(/[[\]()]/g, '\\$&')}(?:(?:\\s*>\\s*|\\s+)${LINGKUP.replace(/[[\]()]/g, '\\$&')})+`, 'g')
  return teks.replace(pola, LINGKUP)
}

/** Satu selektor dibungkus ke lingkup wadah; `html`/`body`/`:root` merujuk wadah itu sendiri. */
function lingkupSelektor(tree: Pohon, teks: string): string {
  const ast = tree.parse(teks, { context: 'selector', positions: true }) as Selector
  const ganti: Gantian[] = []
  ubahSelektor(tree, ast, ganti)
  let hasil = teks
  for (const g of [...ganti].sort((a, b) => b.mulai - a.mulai)) {
    hasil = hasil.slice(0, g.mulai) + LINGKUP + hasil.slice(g.selesai)
  }
  hasil = lipatJangkar(hasil)
  return hasil.startsWith(LINGKUP) ? hasil : `${LINGKUP} ${hasil}`
}

function kurungDaftar(tree: Pohon, daftar: List<CssNode>): void {
  daftar.forEach((n) => {
    if (n.type === 'Rule') {
      const prelude = n.prelude as SelectorList
      const bagian: string[] = []
      prelude.children.forEach((sel) => bagian.push(lingkupSelektor(tree, tree.generate(sel))))
      n.prelude = tree.parse(bagian.join(','), { context: 'selectorList' }) as SelectorList
      kurungDaftar(tree, (n.block as Block).children)
    } else if (n.type === 'Atrule') {
      const nama = n.name.toLowerCase()
      if (/(?:^|-)keyframes$/.test(nama)) return
      if (n.block) kurungDaftar(tree, n.block.children)
    }
  })
}

/** Mengurung semua selektor AST ke lingkup wadah `[data-situs-kustom]` dan menghasilkan CSS-nya. */
export function kurungCss(ast: CssNode): string {
  if (!pohon) throw new Error('css-tree belum dimuat; panggil periksaCss lebih dulu.')
  kurungDaftar(pohon, (ast as StyleSheet).children)
  return pohon.generate(ast)
}

const urutBaris = (daftar: MasalahCss[]): MasalahCss[] => [...daftar].sort((a, b) => a.baris - b.baris)

/**
 * Memeriksa CSS kustom desa: menolak pelanggaran dengan nomor baris, memberi peringatan kontras, dan
 * menghasilkan CSS yang sudah dikurung ke lingkup website desa (`terlingkup`, null bila ada masalah).
 */
export async function periksaCss(css: string, o: { polaMedia: RegExp }): Promise<HasilPeriksaCss> {
  if (new TextEncoder().encode(css).length > BATAS_CSS) {
    return { masalah: [{ baris: 1, pesan: 'CSS paling besar 50 KB.' }], peringatan: [], terlingkup: null }
  }
  const tree = await muatPohon()
  const masalah: MasalahCss[] = []
  const ast = tree.parse(css, {
    positions: true,
    onParseError: (e) => {
      const b = e.line ?? 1
      masalah.push({ baris: b, pesan: `Baris ${b}: ${e.message.replace(/\.$/, '')}.` })
    },
  })
  const baris = pembuatBaris(css)
  const polaMedia = new RegExp(o.polaMedia.source, o.polaMedia.flags.replace('g', ''))
  const tanpaKomentar = buangKomentar(css)
  masalah.push(...cekKataTerlarang(tanpaKomentar, baris))
  masalah.push(...cekTandaMiring(tanpaKomentar, baris))
  masalah.push(...cekUrl(tanpaKomentar, baris, polaMedia, rentangSrcFontFace(ast, tree)))
  masalah.push(...cekFungsiGambar(tanpaKomentar, baris, polaMedia))
  masalah.push(...cekAtrule(ast, tree))
  const peringatan = urutBaris(peringatanKontras(nilaiKontrakDiubah(ast, tree)))
  if (masalah.length > 0) return { masalah: urutBaris(masalah), peringatan, terlingkup: null }
  return { masalah: [], peringatan, terlingkup: kurungCss(ast) }
}
