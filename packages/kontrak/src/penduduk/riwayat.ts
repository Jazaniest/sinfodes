import { z } from 'zod'
import { JENIS_MUTASI, pelakuSchema } from '../mutasi/schema'

/** Field penduduk yang perubahannya dicatat ke Riwayat (SPEC §6.1, §6.4). */
export const FIELD_RIWAYAT = [
  'nik', 'nama', 'jenisKelamin', 'golonganDarah', 'agama', 'kewarganegaraan', 'tempatLahir', 'tanggalLahir',
  'nomorAktaLahir', 'hubunganKeluarga', 'namaAyah', 'namaIbu', 'pendidikan', 'pekerjaan', 'statusPerkawinan',
  'statusPenduduk', 'ktpEl', 'telepon', 'catatan',
] as const
export type FieldRiwayat = (typeof FIELD_RIWAYAT)[number]

export const LABEL_FIELD: Readonly<Record<FieldRiwayat, string>> = {
  nik: 'NIK',
  nama: 'Nama',
  jenisKelamin: 'Jenis kelamin',
  golonganDarah: 'Golongan darah',
  agama: 'Agama',
  kewarganegaraan: 'Kewarganegaraan',
  tempatLahir: 'Tempat lahir',
  tanggalLahir: 'Tanggal lahir',
  nomorAktaLahir: 'Nomor akta lahir',
  hubunganKeluarga: 'Hubungan dalam keluarga',
  namaAyah: 'Nama ayah',
  namaIbu: 'Nama ibu',
  pendidikan: 'Pendidikan',
  pekerjaan: 'Pekerjaan',
  statusPerkawinan: 'Status perkawinan',
  statusPenduduk: 'Status penduduk',
  ktpEl: 'KTP-el',
  telepon: 'Nomor telepon',
  catatan: 'Catatan',
}

const waktu = z.iso.datetime({ offset: true })

/** Satu perubahan field: "Pekerjaan: Pelajar/Mahasiswa → Karyawan Swasta · Rosmiati · 12 Jan 2026". */
export const riwayatSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  pendudukId: z.string(),
  field: z.enum(FIELD_RIWAYAT),
  nilaiLama: z.string().nullable(),
  nilaiBaru: z.string().nullable(),
  oleh: pelakuSchema,
  waktu,
})
export type Riwayat = z.infer<typeof riwayatSchema>

/** Isi tab Riwayat di profil (SPEC §6.3): pembuatan data, perubahan field, dan mutasi. */
export const entriRiwayatSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('dibuat'), id: z.string(), waktu }),
  z.object({
    jenis: z.literal('ubah'),
    id: z.string(),
    waktu,
    oleh: pelakuSchema,
    field: z.enum(FIELD_RIWAYAT),
    nilaiLama: z.string().nullable(),
    nilaiBaru: z.string().nullable(),
  }),
  z.object({
    jenis: z.literal('mutasi'),
    id: z.string(),
    waktu,
    oleh: pelakuSchema,
    mutasi: z.enum(JENIS_MUTASI),
    tanggal: z.iso.date(),
  }),
])
export type EntriRiwayat = z.infer<typeof entriRiwayatSchema>
