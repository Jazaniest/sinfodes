import { z } from 'zod'
import { JENIS_LEMBAGA } from '../lembaga/schema'
import { lapisanPetaSchema } from '../peta/schema'
import { desaSchema, istilahWilayahSchema } from '../wilayah/schema'
import { fotoPublikSchema } from './schema'

const jumlah = z.number().int().min(0)

/** Satu orang di pemerintah desa atau lembaga: jabatan dan nama saja, tanpa rujukan ke data penduduk. */
export const pengurusPublikSchema = z.object({ jabatan: z.string(), nama: z.string(), masaBakti: z.string() })
export type PengurusPublik = z.infer<typeof pengurusPublikSchema>

/** GET /publik/:slug/profil (SPEC §9). Bagian yang belum diisi desa dikirim kosong atau null. */
export const profilPublikSchema = z.object({
  foto: fotoPublikSchema.nullable(),
  sejarah: z.array(z.string()),
  visi: z.string().nullable(),
  misi: z.array(z.string()),
  luasKm2: desaSchema.shape.luasKm2,
  batas: desaSchema.shape.batas,
  jarak: z.array(z.object({ ke: z.string(), tempat: z.string(), km: z.number().positive() })),
  istilah: istilahWilayahSchema,
  wilayah: z.array(z.object({ id: z.string(), nama: z.string(), kepala: z.string(), rw: jumlah, rt: jumlah })),
  /** Batas dusun, fasilitas umum, dan lokasi kegiatan pembangunan; null bila peta desa belum ada. */
  peta: lapisanPetaSchema.nullable(),
  /** Perangkat desa, urut jabatan (SPEC §12.1). */
  perangkat: z.array(pengurusPublikSchema),
  /** Lembaga lain urut SPEC §8; lembaga tanpa pengurus tidak dikirim. */
  lembaga: z.array(z.object({ lembaga: z.enum(JENIS_LEMBAGA), nama: z.string(), pengurus: z.array(pengurusPublikSchema).min(1) })),
  /** Profil singkat desa rekaman yang belum punya profil lengkap (SPEC-V0.2 §13); null untuk desa lain. */
  profilSingkat: z.array(z.string()).nullable(),
})
export type ProfilPublik = z.infer<typeof profilPublikSchema>

/** Urutan batas wilayah di halaman Profil. */
export const ARAH_BATAS = [
  ['utara', 'Utara'],
  ['timur', 'Timur'],
  ['selatan', 'Selatan'],
  ['barat', 'Barat'],
] as const

/** "Siti Aminah (Ketua) · 8 pengurus": pengurus pertama beserta jabatannya, dan jumlah seluruh pengurus. */
export function ringkasLembaga(pengurus: readonly PengurusPublik[]): string {
  const [pertama] = pengurus
  if (!pertama) return ''
  const nama = `${pertama.nama} (${pertama.jabatan})`
  return pengurus.length > 1 ? `${nama} · ${pengurus.length} pengurus` : nama
}
