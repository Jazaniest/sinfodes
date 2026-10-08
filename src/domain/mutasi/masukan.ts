import { z } from 'zod'
import { JENIS_KELAMIN, STATUS_PENDUDUK, type HubunganKeluarga } from '../penduduk/enum'
import { biodataSchema, tempatKeluargaSchema } from '../penduduk/masukan'
import { pendudukSchema } from '../penduduk/schema'
import {
  ALASAN_PINDAH, JENIS_KELAHIRAN, PENOLONG_KELAHIRAN, SEBAB_KEMATIAN, TEMPAT_DILAHIRKAN, YANG_MENERANGKAN_KEMATIAN,
} from './enum'
import { alamatWilayahSchema, mutasiSchema } from './schema'

const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Jam tidak valid')
const teksWajib = (pesan: string) => z.string().trim().min(1, pesan).max(100)

/** POST /mutasi/lahir (SPEC §6.6). Bayi dicatat tanpa NIK, karena NIK baru terbit dari Dukcapil. */
export const masukanLahirSchema = z.object({
  ibuId: z.string().min(1, 'Pilih ibu'),
  ayahId: z.string().min(1).nullable(),
  bayi: z.object({
    nama: teksWajib('Nama bayi wajib diisi'),
    jenisKelamin: z.enum(JENIS_KELAMIN),
    tempatLahir: teksWajib('Tempat lahir wajib diisi'),
    tanggalLahir: z.iso.date(),
    jam,
    tempatDilahirkan: z.enum(TEMPAT_DILAHIRKAN),
    jenisKelahiran: z.enum(JENIS_KELAHIRAN),
    anakKe: z.number().int().min(1).max(20),
    penolong: z.enum(PENOLONG_KELAHIRAN),
    beratGram: z.number().int().min(500).max(6000),
    panjangCm: z.number().int().min(30).max(65),
  }),
  pelapor: teksWajib('Nama pelapor wajib diisi'),
})
export type MasukanLahir = z.infer<typeof masukanLahirSchema>

/** POST /mutasi/meninggal. Pengganti wajib bila yang meninggal kepala keluarga dan masih ada anggota lain. */
export const masukanMeninggalSchema = z.object({
  pendudukId: z.string().min(1, 'Pilih penduduk'),
  tanggal: z.iso.date(),
  jam,
  tempat: teksWajib('Tempat meninggal wajib diisi'),
  sebab: z.enum(SEBAB_KEMATIAN),
  yangMenerangkan: z.enum(YANG_MENERANGKAN_KEMATIAN),
  pelapor: teksWajib('Nama pelapor wajib diisi'),
  penggantiKepalaId: z.string().min(1).nullable(),
})
export type MasukanMeninggal = z.infer<typeof masukanMeninggalSchema>

/** POST /mutasi/pindah: satu orang atau beberapa anggota dari KK yang sama. */
export const masukanPindahSchema = z.object({
  pendudukIds: z.array(z.string().min(1)).min(1, 'Pilih penduduk yang pindah'),
  tanggal: z.iso.date(),
  tujuan: alamatWilayahSchema,
  alasan: z.enum(ALASAN_PINDAH),
  penggantiKepalaId: z.string().min(1).nullable(),
})
export type MasukanPindah = z.infer<typeof masukanPindahSchema>

/** Biodata pendatang: NIK asal wajib dan tetap dipakai (SPEC §6.6). Status Tetap/Sementara berlaku untuk semua anggota. */
export const anggotaDatangSchema = biodataSchema
  .omit({ statusPenduduk: true })
  .extend({ nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 angka') })
export type AnggotaDatang = z.infer<typeof anggotaDatangSchema>

/** POST /mutasi/datang. */
export const masukanDatangSchema = z.object({
  nomorSkpwni: z.string().trim().min(1, 'Nomor SKPWNI wajib diisi').max(40),
  asal: alamatWilayahSchema,
  tanggal: z.iso.date(),
  keluarga: tempatKeluargaSchema,
  statusPenduduk: z.enum(STATUS_PENDUDUK),
  anggota: z.array(anggotaDatangSchema).min(1, 'Isi minimal satu anggota').max(15),
})
export type MasukanDatang = z.infer<typeof masukanDatangSchema>

/** Hasil POST /mutasi/*: mutasi yang tercatat dan penduduk yang terdampak. */
export const hasilMutasiSchema = z.object({ mutasi: mutasiSchema, penduduk: z.array(pendudukSchema) })
export type HasilMutasi = z.infer<typeof hasilMutasiSchema>

/** Hubungan bayi dalam KK ibunya. */
export function hubunganBayi(hubunganIbu: HubunganKeluarga): HubunganKeluarga {
  if (hubunganIbu === 'Kepala Keluarga' || hubunganIbu === 'Istri' || hubunganIbu === 'Suami') return 'Anak'
  if (hubunganIbu === 'Anak' || hubunganIbu === 'Menantu') return 'Cucu'
  return 'Famili Lain'
}
