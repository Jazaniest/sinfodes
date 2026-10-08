import { z } from 'zod'
import {
  AGAMA, GOLONGAN_DARAH, HUBUNGAN_KELUARGA, JENIS_KELAMIN, KEWARGANEGARAAN, KTP_EL, PEKERJAAN, PENDIDIKAN,
  STATUS_DASAR, STATUS_PENDUDUK, STATUS_PERKAWINAN,
} from './enum'

const nomor3 = z.string().regex(/^\d{3}$/)

/** SPEC §6.1 — setiap data membawa `desaId` (multi-tenant, K6). */
export const pendudukSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  nik: z.string().regex(/^\d{16}$/).nullable(),
  nama: z.string().min(1),
  jenisKelamin: z.enum(JENIS_KELAMIN),
  golonganDarah: z.enum(GOLONGAN_DARAH),
  agama: z.enum(AGAMA),
  kewarganegaraan: z.enum(KEWARGANEGARAAN),
  tempatLahir: z.string().min(1),
  tanggalLahir: z.iso.date(),
  nomorAktaLahir: z.string().nullable(),
  keluargaId: z.string(),
  hubunganKeluarga: z.enum(HUBUNGAN_KELUARGA),
  namaAyah: z.string(),
  namaIbu: z.string(),
  dusunId: z.string(),
  rw: nomor3,
  rt: nomor3,
  pendidikan: z.enum(PENDIDIKAN).nullable(),
  pekerjaan: z.enum(PEKERJAAN).nullable(),
  statusPerkawinan: z.enum(STATUS_PERKAWINAN).nullable(),
  statusDasar: z.enum(STATUS_DASAR),
  statusPenduduk: z.enum(STATUS_PENDUDUK),
  ktpEl: z.enum(KTP_EL),
  telepon: z.string().regex(/^08\d{8,11}$/).nullable(),
  catatan: z.string().nullable(),
  dibuatPada: z.iso.datetime({ offset: true }),
  diubahPada: z.iso.datetime({ offset: true }),
})
export type Penduduk = z.infer<typeof pendudukSchema>

/** Baris daftar penduduk: data penduduk + nomor KK-nya (kolom "Hubungan · No. KK", SPEC §6.2). */
export const barisPendudukSchema = pendudukSchema.extend({ nomorKk: z.string().regex(/^\d{16}$/) })
export type BarisPenduduk = z.infer<typeof barisPendudukSchema>

/** Kepala halaman Penduduk: "2.812 jiwa · diperbarui hari ini 08.15". */
export const ringkasanPendudukSchema = z.object({
  jiwa: z.number().int().min(0),
  kk: z.number().int().min(0),
  diperbaruiPada: z.iso.datetime({ offset: true }).nullable(),
})
export type RingkasanPenduduk = z.infer<typeof ringkasanPendudukSchema>
