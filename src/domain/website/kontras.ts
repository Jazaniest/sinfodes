import { LATAR, type TemaDasar } from './tema'

const KANAL_HEX = /^#([0-9a-f]{6})$/i

const keLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const dariLinear = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

function kanalSrgb(hex: string): [number, number, number] {
  const cocok = KANAL_HEX.exec(hex)
  if (!cocok) throw new Error(`Warna tidak valid: ${hex}`)
  return [0, 2, 4].map((i) => parseInt(cocok[1].slice(i, i + 2), 16) / 255) as [number, number, number]
}

/** Luminans relatif WCAG 2.x dari warna #RRGGBB. */
export function luminans(hex: string): number {
  const [r, g, b] = kanalSrgb(hex).map(keLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rasio kontras WCAG antara dua warna (1-21). */
export function rasioKontras(a: string, b: string): number {
  const [terang, gelap] = [luminans(a), luminans(b)].sort((x, y) => y - x)
  return (terang + 0.05) / (gelap + 0.05)
}

/** Satu desimal berkoma, dibulatkan ke bawah supaya 4,49 tidak pernah tampil 4,5. */
export function formatRasio(r: number): string {
  return (Math.floor(r * 10 + 1e-12) / 10).toFixed(1).replace('.', ',')
}

export type Pemeriksaan = {
  kunci: 'utama-latar' | 'putih-utama' | 'aksen-latar'
  rasio: number
  minimum: number
  lolos: boolean
  pesan: string | null
}

const PUTIH = '#FFFFFF'

/** Tiga pemeriksaan kontras Tampilan Dasar (SPEC-V0.2 §11.1). Perbandingan memakai rasio asli, tanpa pembulatan. */
export function periksaTema(t: Pick<TemaDasar, 'warnaUtama' | 'warnaAksen' | 'latar'>): Pemeriksaan[] {
  const latar = LATAR[t.latar].latar
  const butir = (kunci: Pemeriksaan['kunci'], rasio: number, minimum: number, awal: string): Pemeriksaan => {
    const lolos = rasio >= minimum
    return {
      kunci,
      rasio,
      minimum,
      lolos,
      pesan: lolos ? null : `Kontras ${awal} ${formatRasio(rasio)} : 1; perlu paling sedikit ${minimum === 4.5 ? '4,5' : '3'} : 1.`,
    }
  }
  return [
    butir('utama-latar', rasioKontras(t.warnaUtama, latar), 4.5, 'warna utama di atas latar'),
    butir('putih-utama', rasioKontras(PUTIH, t.warnaUtama), 4.5, 'teks putih di atas warna utama'),
    butir('aksen-latar', rasioKontras(t.warnaAksen, latar), 3, 'warna aksen di atas latar'),
  ]
}

/** OKLCH (Ottosson 2020): `l` 0-1, `c` kroma, `h` derajat. */
export function keOklch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = kanalSrgb(hex).map(keLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(bb, a) * 180) / Math.PI
  return { l: L, c: Math.hypot(a, bb), h: h < 0 ? h + 360 : h }
}

/** Kebalikan `keOklch`; kanal di luar gamut sRGB dipotong. */
export function dariOklch(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  const kanal = linear.map((v) => Math.round(Math.min(1, Math.max(0, dariLinear(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0'))
  return `#${kanal.join('')}`.toUpperCase()
}

/**
 * Menurunkan L di OKLCH 0,01 setiap langkah (C dan H tetap, dipotong ke gamut) sampai `uji` lolos.
 * Warna yang sudah lolos dikembalikan tetap; bila tak ada yang lolos sampai L habis, hasilnya hitam.
 */
export function gelapkanSampaiLolos(hex: string, uji: (hex: string) => boolean): string {
  const awal = hex.toUpperCase()
  if (uji(awal)) return awal
  const { l, c, h } = keOklch(awal)
  for (let langkah = 1; ; langkah++) {
    const lBaru = l - 0.01 * langkah
    if (lBaru <= 0) return '#000000'
    const calon = dariOklch(lBaru, c, h)
    if (uji(calon)) return calon
  }
}
