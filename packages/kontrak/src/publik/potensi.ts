import { z } from 'zod'
import { KATEGORI_POTENSI } from '../website/schema'
import { fotoPublikSchema } from './schema'

export const butirPotensiSchema = z.object({
  id: z.string(),
  judul: z.string(),
  kategori: z.enum(KATEGORI_POTENSI),
  ringkasan: z.string(),
  isi: z.array(z.string()).min(1),
  foto: fotoPublikSchema.nullable(),
})
export type ButirPotensi = z.infer<typeof butirPotensiSchema>

/** UMKM di website: nama dusun sudah dirangkai; nomor WhatsApp berawalan 08. */
export const umkmPublikSchema = z.object({
  id: z.string(),
  nama: z.string(),
  pemilik: z.string(),
  produk: z.string(),
  dusun: z.string(),
  whatsapp: z.string(),
})
export type UmkmPublik = z.infer<typeof umkmPublikSchema>

/** GET /publik/:slug/potensi (SPEC §9). */
export const potensiPublikSchema = z.object({ potensi: z.array(butirPotensiSchema), umkm: z.array(umkmPublikSchema) })
export type PotensiPublik = z.infer<typeof potensiPublikSchema>

/** Pesan pembuka WhatsApp ke penjual (fokus review 4): penjual tahu usaha mana yang ditanyakan dan dari mana pembelinya. */
export const pesanUmkm = (namaUsaha: string, namaDesa: string): string =>
  `Halo, saya melihat ${namaUsaha} di website Desa ${namaDesa}. Apakah produknya masih tersedia?`
