import { z } from 'zod'
import { FIELD_IMPOR } from './kolom'

/** Hasil membaca berkas (POST /impor/penduduk, SPEC §6.8). Isi sel masih mentah, belum dipetakan. */
export const laporanImporSchema = z.object({
  id: z.string(),
  namaBerkas: z.string(),
  dibuatPada: z.iso.datetime({ offset: true }),
  kolom: z.array(z.object({ judul: z.string(), field: z.enum(FIELD_IMPOR).nullable() })),
  /** `nomor` = nomor baris di berkas; baris 1 adalah kepala kolom. */
  baris: z.array(z.object({ nomor: z.number().int().min(2), sel: z.array(z.string()) })),
  /** NIK dan nomor KK dari berkas yang sudah terdaftar. Hanya yang muncul di berkas, bukan seluruh data. */
  nikTerdaftar: z.array(z.string()),
  nomorKkTerdaftar: z.array(z.string()),
})
export type LaporanImpor = z.infer<typeof laporanImporSchema>

const nilaiBarisSchema = z.partialRecord(z.enum(FIELD_IMPOR), z.string())

/** POST /impor/penduduk/:id/konfirmasi: pemetaan kolom, perbaikan per nomor baris, dan baris yang dilewati. */
export const konfirmasiImporSchema = z.object({
  pemetaan: z.array(z.enum(FIELD_IMPOR).nullable()),
  perbaikan: z.record(z.string().regex(/^\d+$/), nilaiBarisSchema),
  lewati: z.array(z.number().int().min(2)),
})
export type KonfirmasiImpor = z.infer<typeof konfirmasiImporSchema>

export const hasilImporSchema = z.object({
  penduduk: z.number().int().min(0),
  keluarga: z.number().int().min(0),
  dilewati: z.number().int().min(0),
  /** Isi "Unduh laporan": satu baris per baris berkas. */
  laporan: z.array(z.object({ nomor: z.number().int(), status: z.enum(['ditambahkan', 'dilewati']), keterangan: z.string() })),
})
export type HasilImpor = z.infer<typeof hasilImporSchema>
