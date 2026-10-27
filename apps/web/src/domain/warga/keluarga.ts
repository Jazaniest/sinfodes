import { z } from 'zod'
import { tanggalValid } from '../format/kalender'
import { FIELD_LAPORAN, STATUS_LAPORAN, type FieldLaporan } from '../laporan/schema'
import { AGAMA, GOLONGAN_DARAH, PEKERJAAN, PENDIDIKAN, STATUS_PERKAWINAN } from '../penduduk/enum'
import { ubahPendudukSchema } from '../penduduk/masukan'
import { LABEL_FIELD } from '../penduduk/riwayat'
import { pendudukSchema } from '../penduduk/schema'
import { kunciKirimSchema } from './ajukan'

const waktu = z.iso.datetime({ offset: true })

/** Satu anggota KK di Keluarga saya (SPEC §10). NIK lengkap dikirim; layar menyamarkannya sampai diketuk. */
export const anggotaKeluargaWargaSchema = pendudukSchema
  .pick({
    id: true, nama: true, nik: true, jenisKelamin: true, tempatLahir: true, tanggalLahir: true, hubunganKeluarga: true,
    agama: true, golonganDarah: true, pendidikan: true, pekerjaan: true, statusPerkawinan: true, namaAyah: true,
    namaIbu: true, telepon: true,
  })
  .extend({ umurBulan: z.number().int().min(0) })
export type AnggotaKeluargaWarga = z.infer<typeof anggotaKeluargaWargaSchema>

/** Laporan perbaikan yang dikirim warga ini, beserta statusnya. */
export const laporanWargaSchema = z.object({
  id: z.string(),
  pendudukId: z.string(),
  namaPenduduk: z.string(),
  field: z.enum(FIELD_LAPORAN),
  nilaiBaru: z.string(),
  status: z.enum(STATUS_LAPORAN),
  dibuatPada: waktu,
  alasanDitolak: z.string().nullable(),
})
export type LaporanWarga = z.infer<typeof laporanWargaSchema>

/** GET /warga/keluarga. Anggota yang meninggal atau pindah tidak ikut. */
export const keluargaWargaSchema = z.object({
  nomorKk: z.string().regex(/^\d{16}$/),
  alamat: z.string(),
  anggota: z.array(anggotaKeluargaWargaSchema).min(1),
  laporan: z.array(laporanWargaSchema),
})
export type KeluargaWarga = z.infer<typeof keluargaWargaSchema>

/** Bagian `data` POST /warga/laporan-data (multipart). Foto dokumen (opsional) dikirim sebagai berkas `foto`. */
export const kirimLaporanWargaSchema = z.object({
  kunci: kunciKirimSchema,
  pendudukId: z.string().min(1),
  field: z.enum(FIELD_LAPORAN),
  nilaiBaru: z.string().trim().min(1, 'Tulis nilai yang benar.').max(100, 'Paling banyak 100 karakter.'),
  catatan: z.string().trim().max(300, 'Paling banyak 300 karakter.').nullable(),
})
export type KirimLaporanWarga = z.infer<typeof kirimLaporanWargaSchema>

/** "1405092011238004" → "•••• •••• •••• 8004". */
export const samarkanNomorKk = (nomor: string): string => `•••• •••• •••• ${nomor.slice(-4)}`

const PILIHAN: Partial<Record<FieldLaporan, readonly string[]>> = {
  agama: AGAMA,
  golonganDarah: GOLONGAN_DARAH,
  pendidikan: PENDIDIKAN,
  pekerjaan: PEKERJAAN,
  statusPerkawinan: STATUS_PERKAWINAN,
}

/** Daftar pilihan untuk field berpilihan; null untuk field yang diketik. */
export const pilihanLaporan = (field: FieldLaporan): readonly string[] | null => PILIHAN[field] ?? null

/**
 * Pesan bila nilai baru tidak sah untuk field-nya atau sama dengan data sekarang; null bila boleh dilaporkan
 * (fokus review 5). Dipakai layar dan API tiruan.
 */
export function periksaNilaiLaporan(field: FieldLaporan, nilai: string, nilaiLama: string | null, hariIni: string): string | null {
  const v = nilai.trim()
  const label = LABEL_FIELD[field].toLowerCase()
  if (v === '') return 'Tulis nilai yang benar.'
  const pilihan = pilihanLaporan(field)
  if (pilihan) {
    if (!pilihan.includes(v)) return `Pilih ${label} dari daftar.`
  } else if (field === 'tanggalLahir') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
    if (!m || !tanggalValid(Number(m[1]), Number(m[2]), Number(m[3]))) return 'Tanggal lahir tidak valid.'
    if (v > hariIni) return 'Tanggal lahir tidak boleh sesudah hari ini.'
  } else {
    const hasil = ubahPendudukSchema.safeParse({ [field]: v })
    if (!hasil.success) return hasil.error.issues[0]?.message ?? `Nilai ${label} tidak valid.`
  }
  if (v === (nilaiLama ?? '')) return `Nilai ini sama dengan ${label} yang tercatat sekarang.`
  return null
}
