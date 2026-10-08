import { z } from 'zod'

const nomor3 = z.string().regex(/^\d{3}$/)

export const istilahWilayahSchema = z.object({ dusun: z.string().min(1), rw: z.string().min(1), rt: z.string().min(1) })
export const rtSchema = z.object({ nomor: nomor3, ketua: z.string() })
export const rwSchema = z.object({ nomor: nomor3, ketua: z.string(), rt: z.array(rtSchema).min(1) })

export const dusunSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  nomor: z.number().int().min(1),
  nama: z.string(),
  kepalaDusun: z.string(),
  posyandu: z.string(),
  rw: z.array(rwSchema).min(1),
})
export type Dusun = z.infer<typeof dusunSchema>

export const STATUS_DESA = ['Uji coba', 'Persiapan', 'Aktif', 'Ditangguhkan'] as const
const kodeNama = z.object({ kode: z.string(), nama: z.string() })

export const desaSchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nama: z.string(),
  kodeDesa: z.string(),
  kecamatan: kodeNama,
  kabupaten: kodeNama,
  provinsi: kodeNama,
  kodePos: z.string(),
  alamatKantor: z.string(),
  surel: z.string(),
  telepon: z.string(),
  jamLayanan: z.array(z.object({ hari: z.string(), buka: z.string(), tutup: z.string() })),
  luasKm2: z.number().positive().nullable(),
  batas: z.object({ utara: z.string(), selatan: z.string(), timur: z.string(), barat: z.string() }).nullable(),
  istilahWilayah: istilahWilayahSchema,
  kodeSurat: z.string().min(1),
  status: z.enum(STATUS_DESA),
})
export type Desa = z.infer<typeof desaSchema>
