import { z } from 'zod'

/** Gambar yang boleh diunggah: lambang desa, logo website, dan foto sampul. */
export const JENIS_GAMBAR = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const
export const EKSTENSI_GAMBAR = ['.png', '.jpg', '.jpeg', '.webp', '.svg'] as const

/** Batas ukuran per jenis unggahan, dalam KB. */
export const MAKS_GAMBAR_KB = { lambang: 500, logo: 500, sampul: 1500 } as const

const POLA_DATA_URL = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/
const PESAN_JENIS = 'Berkas harus gambar PNG, JPG, WebP, atau SVG.'

/** Perkiraan ukuran berkas asli dari data URL base64, dalam KB (dibulatkan ke atas). */
export function ukuranDataUrlKb(dataUrl: string): number {
  const isi = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const pengisi = isi.endsWith('==') ? 2 : isi.endsWith('=') ? 1 : 0
  return Math.ceil(((isi.length * 3) / 4 - pengisi) / 1024)
}

/** Data URL gambar yang sah dan tidak melebihi `maksKb`. */
export const gambarDataUrlSchema = (maksKb: number) =>
  z
    .string()
    .regex(POLA_DATA_URL, PESAN_JENIS)
    .refine((s) => ukuranDataUrlKb(s) <= maksKb, `Ukuran gambar paling besar ${maksKb} KB.`)

/** Periksa berkas sebelum dibaca: jenis dan ukurannya. Mengembalikan pesan galat, atau null bila boleh. */
export function periksaBerkasGambar(berkas: { type: string; size: number }, maksKb: number): string | null {
  if (!(JENIS_GAMBAR as readonly string[]).includes(berkas.type)) return PESAN_JENIS
  if (berkas.size > maksKb * 1024) return `Ukuran gambar paling besar ${maksKb} KB.`
  return null
}
