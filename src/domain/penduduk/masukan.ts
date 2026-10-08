import { z } from 'zod'
import {
  AGAMA, GOLONGAN_DARAH, HUBUNGAN_KELUARGA, JENIS_KELAMIN, KEWARGANEGARAAN, KTP_EL, PEKERJAAN, PENDIDIKAN,
  STATUS_PENDUDUK, STATUS_PERKAWINAN,
} from './enum'
import type { Penduduk } from './schema'

const nomor3 = z.string().regex(/^\d{3}$/)

/** KK tujuan penduduk baru: KK yang sudah ada, atau KK baru di wilayah tertentu (SPEC §6.4). */
export const tempatKeluargaSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('ada'), id: z.string().min(1) }),
  z.object({ jenis: z.literal('baru'), dusunId: z.string().min(1), rw: nomor3, rt: nomor3 }),
])
export type TempatKeluarga = z.infer<typeof tempatKeluargaSchema>

/**
 * Biodata yang diisi lewat formulir (SPEC §6.4). Alamat mengikuti KK; status dasar hanya berubah lewat mutasi.
 * Setiap field di sini juga ada di FIELD_RIWAYAT, jadi perubahannya selalu tercatat.
 */
export const biodataSchema = z.object({
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 angka').nullable(),
  nama: z.string().trim().min(1, 'Nama lengkap wajib diisi').max(100),
  jenisKelamin: z.enum(JENIS_KELAMIN),
  golonganDarah: z.enum(GOLONGAN_DARAH),
  agama: z.enum(AGAMA),
  kewarganegaraan: z.enum(KEWARGANEGARAAN),
  tempatLahir: z.string().trim().min(1, 'Tempat lahir wajib diisi').max(60),
  tanggalLahir: z.iso.date(),
  nomorAktaLahir: z.string().trim().min(1).max(40).nullable(),
  hubunganKeluarga: z.enum(HUBUNGAN_KELUARGA),
  namaAyah: z.string().trim().max(100),
  namaIbu: z.string().trim().max(100),
  pendidikan: z.enum(PENDIDIKAN).nullable(),
  pekerjaan: z.enum(PEKERJAAN).nullable(),
  statusPerkawinan: z.enum(STATUS_PERKAWINAN).nullable(),
  statusPenduduk: z.enum(STATUS_PENDUDUK),
  ktpEl: z.enum(KTP_EL),
  telepon: z.string().regex(/^08\d{8,11}$/, 'Nomor telepon diawali 08, 10–13 angka').nullable(),
  catatan: z.string().trim().max(500).nullable(),
})
export type Biodata = z.infer<typeof biodataSchema>

/** Biodata seorang penduduk (field lain dibuang oleh skema). */
export function biodataDari(p: Penduduk): Biodata {
  return biodataSchema.parse(p)
}

/** Isi POST /penduduk. */
export const masukanPendudukSchema = biodataSchema.extend({ keluarga: tempatKeluargaSchema })
export type MasukanPenduduk = z.infer<typeof masukanPendudukSchema>

/** Isi PATCH /penduduk/:id: hanya field yang berubah. Pindah KK lewat Pecah KK, bukan di sini. */
export const ubahPendudukSchema = biodataSchema.partial()
export type UbahPenduduk = z.infer<typeof ubahPendudukSchema>

/** POST /penduduk/cek-nik: dipanggil saat kolom NIK ditinggalkan (SPEC §6.4). */
export const cekNikSchema = z.object({ nik: z.string().regex(/^\d{16}$/), kecualiId: z.string().optional() })

/** `penduduk` null bila NIK tidak terdaftar, atau terdaftar di desa lain (namanya tidak dibuka). */
export const hasilCekNikSchema = z.object({
  terdaftar: z.boolean(),
  penduduk: z.object({ id: z.string(), nama: z.string() }).nullable(),
})
export type HasilCekNik = z.infer<typeof hasilCekNikSchema>
