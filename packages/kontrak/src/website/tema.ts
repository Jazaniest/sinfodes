import { z } from 'zod'
import { gambarDataUrlSchema, MAKS_GAMBAR_KB } from '../format/gambar'
import { type VariabelKontrak } from './kontrak-tema'
import { ID_MOTIF } from './motif'
import { ID_PASANGAN_HURUF, type IdPasanganHuruf } from './pasangan-huruf'
import { POLA_FOTO_KURASI } from './schema'

/** Delapan preset warna (SPEC-V0.2 §11.1): enam aksen v0.1 dengan hex yang sama, ditambah dua warna baru. */
export const PRESET_WARNA = [
  { id: 'biru-tinta', label: 'Biru tinta', hex: '#1F4E79' },
  { id: 'hijau-sawit', label: 'Hijau sawit', hex: '#2F5D3A' },
  { id: 'teal-sungai', label: 'Teal sungai', hex: '#1E5F5A' },
  { id: 'merah-bata', label: 'Merah bata', hex: '#9A3B2A' },
  { id: 'coklat-tanah', label: 'Coklat tanah', hex: '#6B4A2E' },
  { id: 'ungu-songket', label: 'Ungu songket', hex: '#5A3D6E' },
  { id: 'hijau-lumut', label: 'Hijau lumut', hex: '#4A6B2F' },
  { id: 'biru-laut', label: 'Biru laut', hex: '#14607A' },
] as const
export type IdPreset = (typeof PRESET_WARNA)[number]['id']

export { ID_PASANGAN_HURUF, type IdPasanganHuruf }

/** `judul` dan `isi` adalah nilai `font-family` lengkap dengan huruf cadangan. */
export const PASANGAN_HURUF: Readonly<Record<IdPasanganHuruf, { label: string; judul: string; isi: string }>> = {
  plex: { label: 'Plex (bawaan)', judul: "'IBM Plex Serif', Georgia, serif", isi: "'IBM Plex Sans', system-ui, sans-serif" },
  source: { label: 'Source', judul: "'Source Serif 4', Georgia, serif", isi: "'Source Sans 3', system-ui, sans-serif" },
  literata: { label: 'Literata', judul: "'Literata', Georgia, serif", isi: "'Public Sans', system-ui, sans-serif" },
  fraunces: { label: 'Fraunces', judul: "'Fraunces', Georgia, serif", isi: "'Work Sans', system-ui, sans-serif" },
  bitter: { label: 'Bitter', judul: "'Bitter', Georgia, serif", isi: "'Atkinson Hyperlegible', system-ui, sans-serif" },
  archivo: { label: 'Archivo', judul: "'Archivo', system-ui, sans-serif", isi: "'Archivo', system-ui, sans-serif" },
}

export const ID_LATAR = ['putih', 'kertas'] as const
export type IdLatar = (typeof ID_LATAR)[number]
/** `latar` = warna halaman, `lembar` = warna kartu dan kepala; `kertas` memakai nilai Register. */
export const LATAR: Readonly<Record<IdLatar, { label: string; latar: string; lembar: string; garis: string }>> = {
  putih: { label: 'Putih', latar: '#FAFAF8', lembar: '#FFFFFF', garis: '#E2E1DB' },
  kertas: { label: 'Kertas', latar: '#F6F4EE', lembar: '#FFFEFA', garis: '#DDD7CA' },
}

export const ID_SUDUT = ['tajam', 'sedikit', 'bulat'] as const
export type IdSudut = (typeof ID_SUDUT)[number]
export const SUDUT: Readonly<Record<IdSudut, { label: string; sudut: string; besar: string }>> = {
  tajam: { label: 'Tajam', sudut: '2px', besar: '4px' },
  sedikit: { label: 'Sedikit melengkung', sudut: '6px', besar: '10px' },
  bulat: { label: 'Bulat', sudut: '10px', besar: '16px' },
}

export const ID_KEPADATAN = ['lega', 'rapat'] as const
export type IdKepadatan = (typeof ID_KEPADATAN)[number]
export const KEPADATAN: Readonly<Record<IdKepadatan, { label: string; jarak: string; kecil: string }>> = {
  lega: { label: 'Lega', jarak: '2.5rem', kecil: '1.25rem' },
  rapat: { label: 'Rapat', jarak: '1.5rem', kecil: '0.75rem' },
}

/** Delapan tema galeri (SPEC-V0.2 §11.3); isinya di `galeri-tema.ts`. */
export const ID_TEMA = ['warta', 'balai', 'pesisir', 'serambi', 'ladang', 'tenun', 'rimba', 'bandar'] as const
export type IdTema = (typeof ID_TEMA)[number]
export const adalahIdTema = (id: string): id is IdTema => (ID_TEMA as readonly string[]).includes(id)

/** Bentuk kepala halaman: nameplate bertanggal, satu baris ringkas, atau pita penuh warna utama. */
export const ID_KEPALA = ['warta', 'ringkas', 'pita'] as const
export type IdKepala = (typeof ID_KEPALA)[number]

/** Perlakuan foto sampul dan kartu: berbingkai dengan keterangan di bawah, atau melebar dengan keterangan di atas foto. */
export const ID_FOTO = ['bingkai', 'penuh'] as const
export type IdFoto = (typeof ID_FOTO)[number]

const PESAN_HEX = 'Kode warna harus berbentuk #RRGGBB.'
const PESAN_SAMBUTAN = 'Kalimat sambutan paling banyak 120 karakter.'
const PESAN_SAMPUL = `Foto sampul harus gambar PNG, JPG, WebP, atau SVG, paling besar ${MAKS_GAMBAR_KB.sampul} KB.`

const hex = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, PESAN_HEX)
  .transform((s) => s.toUpperCase())
const sampulSah = (s: string) => POLA_FOTO_KURASI.test(s) || gambarDataUrlSchema(MAKS_GAMBAR_KB.sampul).safeParse(s).success
const fotoSampul = z.string().refine(sampulSah, PESAN_SAMPUL).nullable()

/** Tema Dasar website desa (SPEC-V0.2 §11.1). `warga` hanya dipakai halaman masuk dan layanan warga. */
export const temaDasarSchema = z.object({
  warnaUtama: hex,
  warnaAksen: hex,
  latar: z.enum(ID_LATAR),
  huruf: z.enum(ID_PASANGAN_HURUF),
  sudut: z.enum(ID_SUDUT),
  kepadatan: z.enum(ID_KEPADATAN),
  kepala: z.enum(ID_KEPALA).default('warta'),
  foto: z.enum(ID_FOTO).default('bingkai'),
  motif: z.enum(ID_MOTIF),
  logo: gambarDataUrlSchema(MAKS_GAMBAR_KB.logo).nullable(),
  sampul: fotoSampul,
  /** Tema galeri yang sedang terpasang; null begitu satu pengaturan diubah dari nilai tema. */
  idGaleri: z.enum(ID_TEMA).nullable().default(null),
  warga: z.object({
    fotoLatar: fotoSampul,
    sambutan: z
      .string()
      .trim()
      .max(120, PESAN_SAMBUTAN)
      .transform((s) => (s === '' ? null : s))
      .nullable(),
  }),
})
export type TemaDasar = z.infer<typeof temaDasarSchema>

/** Tema bawaan: Warta dengan Plex, latar kertas, sudut tajam, jarak lega. */
export function TEMA_WARTA_BAWAAN(warnaHex: string): TemaDasar {
  return {
    warnaUtama: warnaHex,
    warnaAksen: warnaHex,
    latar: 'kertas',
    huruf: 'plex',
    sudut: 'tajam',
    kepadatan: 'lega',
    kepala: 'warta',
    foto: 'bingkai',
    motif: 'pucuk-rebung',
    logo: null,
    sampul: null,
    idGaleri: null,
    warga: { fotoLatar: null, sambutan: null },
  }
}

const keRgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** Campuran sRGB: `porsi` bagian warna `ke`, sisanya warna `dari`. */
function campur(dari: string, ke: string, porsi: number): string {
  const a = keRgb(dari)
  const b = keRgb(ke)
  const kanal = a.map((x, i) => Math.round(x + (b[i] - x) * porsi).toString(16).padStart(2, '0'))
  return `#${kanal.join('')}`.toUpperCase()
}

/** Turunan warna utama: versi gelap (campur 20% hitam) untuk hover dan versi pucat (campur 90% putih) untuk latar sorotan. */
export function turunanWarna(warna: string): { utama: string; tua: string; muda: string } {
  return { utama: warna.toUpperCase(), tua: campur(warna, '#000000', 0.2), muda: campur(warna, '#FFFFFF', 0.9) }
}

const TEKS = '#1B2631'
const TEKS_2 = '#5A636C'

/** Semua variabel kontrak tema v1 untuk satu tema. */
export function variabelTema(
  t: Pick<TemaDasar, 'warnaUtama' | 'warnaAksen' | 'latar' | 'huruf' | 'sudut' | 'kepadatan'>,
): Record<VariabelKontrak, string> {
  const w = turunanWarna(t.warnaUtama)
  const latar = LATAR[t.latar]
  return {
    '--desa-warna-utama': w.utama,
    '--desa-warna-utama-tua': w.tua,
    '--desa-warna-utama-muda': w.muda,
    '--desa-warna-aksen': t.warnaAksen.toUpperCase(),
    '--desa-latar': latar.latar,
    '--desa-lembar': latar.lembar,
    '--desa-teks': TEKS,
    '--desa-teks-2': TEKS_2,
    '--desa-garis': latar.garis,
    '--desa-huruf-judul': PASANGAN_HURUF[t.huruf].judul,
    '--desa-huruf-isi': PASANGAN_HURUF[t.huruf].isi,
    '--desa-sudut': SUDUT[t.sudut].sudut,
    '--desa-sudut-besar': SUDUT[t.sudut].besar,
    '--desa-jarak': KEPADATAN[t.kepadatan].jarak,
    '--desa-jarak-kecil': KEPADATAN[t.kepadatan].kecil,
  }
}

/** Token Register yang dipakai komponen website, diarahkan ke variabel kontrak supaya komponen lama ikut tema. */
export function pemetaanRegister(): Record<string, string> {
  return {
    '--color-biru': 'var(--desa-warna-utama)',
    '--color-biru-tua': 'var(--desa-warna-utama-tua)',
    '--color-biru-muda': 'var(--desa-warna-utama-muda)',
    '--color-kertas': 'var(--desa-latar)',
    '--color-lembar': 'var(--desa-lembar)',
    '--font-serif': 'var(--desa-huruf-judul)',
    '--font-sans': 'var(--desa-huruf-isi)',
    '--radius-1': 'var(--desa-sudut)',
    '--radius-2': 'var(--desa-sudut-besar)',
  }
}

/** Variabel untuk halaman masuk dan layanan warga: hanya warna utama dan turunannya (tanpa sudut, kepadatan, atau latar). */
export function gayaWarga(warnaUtama: string): Record<string, string> {
  const w = turunanWarna(warnaUtama)
  return {
    '--desa-warna-utama': w.utama,
    '--desa-warna-utama-tua': w.tua,
    '--desa-warna-utama-muda': w.muda,
    '--color-biru': 'var(--desa-warna-utama)',
    '--color-biru-tua': 'var(--desa-warna-utama-tua)',
    '--color-biru-muda': 'var(--desa-warna-utama-muda)',
  }
}
