import { z } from 'zod'
import { gambarDataUrlSchema, MAKS_GAMBAR_KB } from '../format/gambar'

/** Lebar blok di halaman (SPEC-V0.2 11.4): `lebar` yang langsung diikuti `sempit` menjadi pasangan 2fr/1fr di layar >= 1024 px. */
export const ID_LEBAR = ['penuh', 'lebar', 'sempit'] as const
export type IdLebar = (typeof ID_LEBAR)[number]
export const LABEL_LEBAR: Readonly<Record<IdLebar, string>> = { penuh: 'Penuh', lebar: 'Lebar', sempit: 'Sempit' }

/** Katalog blok v0.2 (SPEC-V0.2 11.4); `html` ditambahkan tahap 7G untuk Blok HTML tingkat Lanjut. */
export const JENIS_BLOK = [
  'sampul', 'kabar', 'layanan', 'angka', 'apbdes', 'pengumuman-agenda', 'galeri', 'peta',
  'potensi', 'video', 'sambutan', 'teks', 'ajakan', 'kontak', 'lencana', 'pemisah', 'html',
] as const
export type JenisBlok = (typeof JENIS_BLOK)[number]

export const LABEL_JENIS_BLOK: Readonly<Record<JenisBlok, string>> = {
  sampul: 'Sampul',
  kabar: 'Kabar terbaru',
  layanan: 'Layanan cepat',
  angka: 'Angka desa',
  apbdes: 'APBDes ringkas',
  'pengumuman-agenda': 'Pengumuman & agenda',
  galeri: 'Galeri',
  peta: 'Peta',
  potensi: 'Potensi',
  video: 'Video',
  sambutan: 'Sambutan Kades',
  teks: 'Teks',
  ajakan: 'Ajakan',
  kontak: 'Kontak & jam layanan',
  lencana: 'Lencana juara',
  pemisah: 'Pemisah motif',
  html: 'Blok HTML',
}

export const VARIAN_BLOK = {
  sampul: ['foto-besar', 'foto-samping', 'tanpa-foto'],
  kabar: ['kartu', 'daftar', 'sorotan'],
  layanan: ['kisi', 'daftar'],
  angka: ['kalimat', 'besar'],
  apbdes: ['batang', 'tabel'],
  'pengumuman-agenda': ['berdampingan', 'bertumpuk'],
  galeri: ['kisi', 'geser'],
  peta: ['lebar', 'dengan-keterangan'],
  potensi: ['kartu', 'daftar'],
  video: ['lebar', 'sempit'],
  sambutan: ['foto-kiri', 'kutipan'],
  teks: ['biasa', 'sorot'],
  ajakan: ['pita', 'kotak'],
  kontak: ['kolom', 'ringkas'],
  lencana: ['deret', 'daftar'],
  pemisah: ['motif', 'garis'],
  html: ['bingkai'],
} as const satisfies Record<JenisBlok, readonly string[]>
export type VarianBlok<J extends JenisBlok> = (typeof VARIAN_BLOK)[J][number]

type LabelVarian = { readonly [J in JenisBlok]: Readonly<Record<VarianBlok<J>, string>> }
export const LABEL_VARIAN: LabelVarian = {
  sampul: { 'foto-besar': 'Foto besar', 'foto-samping': 'Foto dengan teks di samping', 'tanpa-foto': 'Tanpa foto' },
  kabar: { kartu: 'Kartu', daftar: 'Daftar', sorotan: 'Satu sorotan' },
  layanan: { kisi: 'Kisi', daftar: 'Daftar' },
  angka: { kalimat: 'Dalam kalimat', besar: 'Angka besar' },
  apbdes: { batang: 'Batang', tabel: 'Tabel' },
  'pengumuman-agenda': { berdampingan: 'Berdampingan', bertumpuk: 'Bertumpuk' },
  galeri: { kisi: 'Kisi', geser: 'Geser mendatar' },
  peta: { lebar: 'Lebar', 'dengan-keterangan': 'Dengan keterangan' },
  potensi: { kartu: 'Kartu', daftar: 'Daftar' },
  video: { lebar: 'Lebar', sempit: 'Sempit' },
  sambutan: { 'foto-kiri': 'Foto di kiri', kutipan: 'Kutipan' },
  teks: { biasa: 'Biasa', sorot: 'Sorotan' },
  ajakan: { pita: 'Pita', kotak: 'Kotak' },
  kontak: { kolom: 'Kolom', ringkas: 'Ringkas' },
  lencana: { deret: 'Deret', daftar: 'Daftar' },
  pemisah: { motif: 'Motif', garis: 'Garis' },
  html: { bingkai: 'Bingkai' },
}

/** Label varian satu blok, mis. "Daftar" untuk Kabar terbaru varian `daftar`. */
export function labelVarianBlok(b: Blok): string {
  return (LABEL_VARIAN as Record<JenisBlok, Record<string, string>>)[b.jenis][b.varian]
}

/**
 * Blok yang datanya diisi server dari modul terkait (dan bisa kosong sehingga tidak tampil); blok lain hanya memakai `isi`
 * yang tersimpan di susunan. Blok `html` mengambil kode dari daftar `blokHtml` di versi situs.
 */
export const BLOK_BERSUMBER: ReadonlySet<JenisBlok> = new Set<JenisBlok>([
  'sampul', 'kabar', 'angka', 'apbdes', 'pengumuman-agenda', 'galeri', 'peta', 'potensi', 'ajakan', 'kontak', 'lencana',
  'html',
])

const PESAN_MAKS = (n: number) => `Paling banyak ${n.toLocaleString('id-ID')} karakter.`
export const PESAN_TAUTAN = 'Tautan harus diawali http:// atau https://.'
export const PESAN_VIDEO = 'Alamat video YouTube tidak dikenali.'
export const PESAN_TUJUAN_AJAKAN = 'Tujuan ajakan tidak ditemukan.'

/** ID video YouTube 11 karakter dari alamat `youtube.com/watch?v=`, `youtu.be/`, atau `youtube.com/shorts/`. */
export function idVideoYoutube(url: string): string | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '')
  let kandidat: string | null = null
  if (host === 'youtube.com') {
    if (u.pathname === '/watch') kandidat = u.searchParams.get('v')
    else kandidat = /^\/(?:shorts|live)\/([A-Za-z0-9_-]+)/.exec(u.pathname)?.[1] ?? null
  } else if (host === 'youtu.be') {
    kandidat = u.pathname.split('/')[1] ?? null
  }
  return kandidat && /^[A-Za-z0-9_-]{11}$/.test(kandidat) ? kandidat : null
}

/** Tautan isi blok: alamat halaman (diawali `/`) atau alamat web http(s). */
const urlTautanIsi = z
  .string()
  .refine((s) => /^https?:\/\//.test(s.trim()) || /^\/(?!\/)/.test(s.trim()), PESAN_TAUTAN)

const isiSampulSchema = z.object({ kalimat: z.string().max(160, PESAN_MAKS(160)) })
const isiKabarSchema = z.object({ jumlah: z.number().int().min(1, 'Paling sedikit 1.').max(6, 'Paling banyak 6.') })
const isiKosongSchema = z.object({})
const isiGaleriSchema = z.object({ jumlah: z.number().int().min(4, 'Paling sedikit 4.').max(12, 'Paling banyak 12.') })
const isiPotensiSchema = z.object({ jumlah: z.number().int().min(3, 'Paling sedikit 3.').max(6, 'Paling banyak 6.') })
const isiVideoSchema = z.object({
  url: z.string().refine((s) => s.trim() === '' || idVideoYoutube(s) !== null, PESAN_VIDEO),
  judul: z.string().max(80, PESAN_MAKS(80)),
})
const isiSambutanSchema = z.object({
  nama: z.string().max(60, PESAN_MAKS(60)),
  jabatan: z.string().max(60, PESAN_MAKS(60)),
  foto: gambarDataUrlSchema(MAKS_GAMBAR_KB.logo).nullable(),
  teks: z.string().max(1200, PESAN_MAKS(1200)),
})
const isiTeksSchema = z.object({
  judul: z.string().max(120, PESAN_MAKS(120)),
  paragraf: z.array(z.string().max(1200, PESAN_MAKS(1200))).min(1, 'Paling sedikit 1 paragraf.').max(5, 'Paling banyak 5 paragraf.'),
  tautan: z.object({ label: z.string().max(40, PESAN_MAKS(40)), url: urlTautanIsi }).nullable(),
})
const isiAjakanSchema = z.object({ judul: z.string().max(120, PESAN_MAKS(120)), tombol: z.string().max(40, PESAN_MAKS(40)), tujuan: z.string() })
const isiHtmlSchema = z.object({ htmlId: z.string() })

/** `id` blok: `blk_` + 6 karakter atau lebih. */
export const POLA_ID_BLOK = /^blk_[a-z0-9]{6,}$/
const idBlok = z.string().regex(POLA_ID_BLOK, 'Kode blok tidak sah.')

/** `id` kode HTML desa (7G): `html_` + 6 karakter atau lebih. */
export const POLA_ID_BLOK_HTML = /^html_[a-z0-9]{6,}$/
export const PESAN_BLOK_HTML_HILANG = 'Blok HTML tidak ditemukan.'
export const PESAN_MAKS_BLOK_HTML = 'Paling banyak 10 blok HTML.'
const PESAN_NAMA_BLOK_HTML = 'Nama blok HTML wajib diisi.'
const PESAN_KODE_BLOK_HTML = 'Kode HTML paling besar 64 KB.'
const PESAN_TINGGI_BLOK_HTML = 'Tinggi 40-3000 px.'

/** Tinggi bingkai Blok HTML: tetap 40-3000 px, atau otomatis mengikuti isi bingkai (dibatasi di pembungkusnya). */
export const tinggiBlokHtmlSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('tetap'), px: z.number().int().min(40, PESAN_TINGGI_BLOK_HTML).max(3000, PESAN_TINGGI_BLOK_HTML) }),
  z.object({ mode: z.literal('otomatis') }),
])
export type TinggiBlokHtml = z.infer<typeof tinggiBlokHtmlSchema>

/**
 * Satu kode HTML desa di tingkat Lanjut (SPEC-V0.2 11.5, keputusan 4 rencana 7G): disimpan per versi situs, paling banyak
 * 10, dan dipakai blok susunan `html` lewat `isi.htmlId`. Ukuran kode dihitung byte UTF-8.
 */
export const blokHtmlSchema = z.object({
  id: z.string().regex(POLA_ID_BLOK_HTML, 'Kode blok HTML tidak sah.'),
  nama: z.string().trim().min(1, PESAN_NAMA_BLOK_HTML).max(60, 'Paling banyak 60 karakter.'),
  kode: z.string().refine((s) => new TextEncoder().encode(s).length <= 64 * 1024, PESAN_KODE_BLOK_HTML),
  tinggi: tinggiBlokHtmlSchema,
})
export type BlokHtml = z.infer<typeof blokHtmlSchema>

/** Daftar kode HTML di satu versi situs: maksimal 10 (keputusan 4 rencana 7G). */
export const daftarBlokHtmlSchema = z.array(blokHtmlSchema).max(10, PESAN_MAKS_BLOK_HTML)

const dasarBlok = { id: idBlok, lebar: z.enum(ID_LEBAR), tersembunyi: z.boolean() }

/** Satu blok susunan halaman (SPEC-V0.2 11.4). Isi kosong berarti belum diisi; yang dibatasi bentuk dan panjangnya. */
export const blokSchema = z.discriminatedUnion('jenis', [
  z.object({ ...dasarBlok, jenis: z.literal('sampul'), varian: z.enum(VARIAN_BLOK.sampul), isi: isiSampulSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('kabar'), varian: z.enum(VARIAN_BLOK.kabar), isi: isiKabarSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('layanan'), varian: z.enum(VARIAN_BLOK.layanan), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('angka'), varian: z.enum(VARIAN_BLOK.angka), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('apbdes'), varian: z.enum(VARIAN_BLOK.apbdes), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('pengumuman-agenda'), varian: z.enum(VARIAN_BLOK['pengumuman-agenda']), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('galeri'), varian: z.enum(VARIAN_BLOK.galeri), isi: isiGaleriSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('peta'), varian: z.enum(VARIAN_BLOK.peta), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('potensi'), varian: z.enum(VARIAN_BLOK.potensi), isi: isiPotensiSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('video'), varian: z.enum(VARIAN_BLOK.video), isi: isiVideoSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('sambutan'), varian: z.enum(VARIAN_BLOK.sambutan), isi: isiSambutanSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('teks'), varian: z.enum(VARIAN_BLOK.teks), isi: isiTeksSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('ajakan'), varian: z.enum(VARIAN_BLOK.ajakan), isi: isiAjakanSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('kontak'), varian: z.enum(VARIAN_BLOK.kontak), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('lencana'), varian: z.enum(VARIAN_BLOK.lencana), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('pemisah'), varian: z.enum(VARIAN_BLOK.pemisah), isi: isiKosongSchema }),
  z.object({ ...dasarBlok, jenis: z.literal('html'), varian: z.enum(VARIAN_BLOK.html), isi: isiHtmlSchema }),
])
export type Blok = z.infer<typeof blokSchema>
export type IsiBlok = Blok['isi']

/** Isi bawaan blok baru; kosong berarti belum diisi dan menunggu disunting. */
export function isiBawaan(jenis: JenisBlok): IsiBlok {
  switch (jenis) {
    case 'sampul':
      return { kalimat: '' }
    case 'kabar':
      return { jumlah: 4 }
    case 'galeri':
      return { jumlah: 6 }
    case 'potensi':
      return { jumlah: 4 }
    case 'video':
      return { url: '', judul: '' }
    case 'sambutan':
      return { nama: '', jabatan: '', foto: null, teks: '' }
    case 'teks':
      return { judul: '', paragraf: [''], tautan: null }
    case 'ajakan':
      return { judul: '', tombol: '', tujuan: 'layanan' }
    case 'html':
      return { htmlId: '' }
    default:
      return {}
  }
}

/** Blok baru untuk penyunting: varian pertama (bawaan), lebar penuh, tampil. */
export function blokBaru(jenis: JenisBlok, id: string): Blok {
  return blokSchema.parse({ id, jenis, varian: VARIAN_BLOK[jenis][0], lebar: 'penuh', tersembunyi: false, isi: isiBawaan(jenis) })
}

/** Susun blok untuk data statis (susunan tema galeri); lolos `blokSchema`. */
export function susunBlok(o: { id: string; jenis: JenisBlok; varian?: string; lebar?: IdLebar; isi?: Partial<Record<string, unknown>> }): Blok {
  return blokSchema.parse({
    id: o.id,
    jenis: o.jenis,
    varian: o.varian ?? VARIAN_BLOK[o.jenis][0],
    lebar: o.lebar ?? 'penuh',
    tersembunyi: false,
    isi: { ...isiBawaan(o.jenis), ...o.isi },
  })
}
