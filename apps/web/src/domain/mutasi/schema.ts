import { z } from 'zod'
import {
  ALASAN_PINDAH, JENIS_KELAHIRAN, PENOLONG_KELAHIRAN, SEBAB_KEMATIAN, TEMPAT_DILAHIRKAN, YANG_MENERANGKAN_KEMATIAN,
} from './enum'

export const JENIS_MUTASI = ['lahir', 'meninggal', 'pindah', 'datang'] as const
export type JenisMutasi = (typeof JENIS_MUTASI)[number]

export const LABEL_MUTASI: Readonly<Record<JenisMutasi, string>> = {
  lahir: 'Lahir',
  meninggal: 'Meninggal',
  pindah: 'Pindah keluar',
  datang: 'Datang',
}

/** Pengguna yang mencatat, disalin ringkas supaya riwayat tetap terbaca walau akunnya berubah. */
export const pelakuSchema = z.object({ id: z.string(), nama: z.string() })
export type Pelaku = z.infer<typeof pelakuSchema>

export const alamatWilayahSchema = z.object({
  provinsi: z.string().min(1),
  kabupaten: z.string().min(1),
  kecamatan: z.string().min(1),
  desa: z.string().min(1),
  alamat: z.string(),
})
export type AlamatWilayah = z.infer<typeof alamatWilayahSchema>

const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const dasar = {
  id: z.string(),
  desaId: z.string(),
  tanggal: z.iso.date(),
  pendudukIds: z.array(z.string()).min(1),
  dicatatOleh: pelakuSchema,
  dicatatPada: z.iso.datetime({ offset: true }),
}

/** SPEC §6.1 dan §6.6: satu kejadian kependudukan beserta rincian per jenis. */
export const mutasiSchema = z.discriminatedUnion('jenis', [
  z.object({
    ...dasar,
    jenis: z.literal('lahir'),
    rincian: z.object({
      jam,
      tempatDilahirkan: z.enum(TEMPAT_DILAHIRKAN),
      tempatLahir: z.string().min(1),
      jenisKelahiran: z.enum(JENIS_KELAHIRAN),
      anakKe: z.number().int().min(1),
      penolong: z.enum(PENOLONG_KELAHIRAN),
      beratGram: z.number().int().min(500).max(6000),
      panjangCm: z.number().int().min(30).max(65),
      ibuId: z.string().nullable(),
      ayahId: z.string().nullable(),
      pelapor: z.string().min(1),
    }),
  }),
  z.object({
    ...dasar,
    jenis: z.literal('meninggal'),
    rincian: z.object({
      jam,
      tempat: z.string().min(1),
      sebab: z.enum(SEBAB_KEMATIAN),
      yangMenerangkan: z.enum(YANG_MENERANGKAN_KEMATIAN),
      pelapor: z.string().min(1),
    }),
  }),
  z.object({
    ...dasar,
    jenis: z.literal('pindah'),
    rincian: z.object({ tujuan: alamatWilayahSchema, alasan: z.enum(ALASAN_PINDAH) }),
  }),
  z.object({
    ...dasar,
    jenis: z.literal('datang'),
    rincian: z.object({ nomorSkpwni: z.string().min(1), asal: alamatWilayahSchema, keluargaId: z.string() }),
  }),
])
export type Mutasi = z.infer<typeof mutasiSchema>
export type MutasiDari<J extends JenisMutasi> = Extract<Mutasi, { jenis: J }>
