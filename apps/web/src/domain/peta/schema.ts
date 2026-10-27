import { z } from 'zod'
import { STATUS_KEGIATAN } from '../pembangunan/schema'
import { titikSchema, type Titik } from './titik'

export { titikSchema, type Titik }

/** Fasilitas umum di peta (SPEC §8). */
export const JENIS_FASILITAS = ['kantor-desa', 'sekolah', 'masjid', 'posyandu', 'pustu'] as const
export type JenisFasilitas = (typeof JENIS_FASILITAS)[number]
export const LABEL_FASILITAS: Readonly<Record<JenisFasilitas, string>> = {
  'kantor-desa': 'Kantor desa',
  sekolah: 'Sekolah',
  masjid: 'Masjid',
  posyandu: 'Posyandu',
  pustu: 'Pustu',
}

/** Batas satu dusun: ring tertutup (titik pertama sama dengan titik terakhir). */
export const batasDusunSchema = z.object({ dusunId: z.string(), batas: z.array(titikSchema).min(4) })

export const fasilitasSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  jenis: z.enum(JENIS_FASILITAS),
  nama: z.string().min(1),
  dusunId: z.string(),
  titik: titikSchema,
  keterangan: z.string().nullable(),
})
export type Fasilitas = z.infer<typeof fasilitasSchema>

/** Geometri desa yang disimpan: pusat peta, batas dusun, dan fasilitas umum. */
export const petaDesaSchema = z.object({
  desaId: z.string(),
  pusat: titikSchema,
  zoom: z.number().min(1).max(20),
  dusun: z.array(batasDusunSchema).min(1),
  fasilitas: z.array(fasilitasSchema),
})
export type PetaDesa = z.infer<typeof petaDesaSchema>

export const kegiatanPetaSchema = z.object({
  id: z.string(),
  nama: z.string(),
  status: z.enum(STATUS_KEGIATAN),
  progresFisik: z.number().int().min(0).max(100),
  dusunId: z.string(),
  titik: titikSchema,
})

/** GET /peta/lapisan. Lokasi kegiatan diambil dari modul Pembangunan. */
export const lapisanPetaSchema = petaDesaSchema.omit({ desaId: true }).extend({ kegiatan: z.array(kegiatanPetaSchema) })
export type LapisanPeta = z.infer<typeof lapisanPetaSchema>

/** Lapisan yang bisa dinyalakan dan dimatikan (SPEC §8). */
export const LAPISAN_PETA = ['dusun', 'fasilitas', 'kegiatan'] as const
export type JenisLapisan = (typeof LAPISAN_PETA)[number]
export const LABEL_LAPISAN: Readonly<Record<JenisLapisan, string>> = {
  dusun: 'Batas dusun',
  fasilitas: 'Fasilitas umum',
  kegiatan: 'Kegiatan pembangunan',
}

/** Objek peta yang sedang dipilih untuk panel info. */
export type ObjekPeta = { jenis: JenisLapisan; id: string }

/** Ring sah: minimal 4 titik, dan titik pertama sama dengan titik terakhir. */
export function ringTertutup(ring: readonly Titik[]): boolean {
  const awal = ring[0]
  const akhir = ring.at(-1)
  return ring.length >= 4 && awal !== undefined && akhir !== undefined && awal[0] === akhir[0] && awal[1] === akhir[1]
}

/** Titik di dalam poligon (ray casting). Dipakai uji data supaya fasilitas dan kegiatan jatuh di dusunnya. */
export function dalamPoligon([x, y]: Titik, ring: readonly Titik[]): boolean {
  let dalam = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dalam = !dalam
  }
  return dalam
}
