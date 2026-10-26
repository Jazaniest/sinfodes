import { z } from 'zod'

/**
 * Modul yang bisa dinyalakan atau dimatikan Sekretaris Desa (SPEC-V0.2 12.3). Baru Kesehatan (Posyandu); data modul yang
 * dimatikan tidak dihapus.
 */
export const modulDesaSchema = z.object({ kesehatan: z.boolean() })
export type ModulDesa = z.infer<typeof modulDesaSchema>

/** Pesan 403 server untuk endpoint Kesehatan selama modulnya mati; layar mengenalinya untuk menampilkan keadaan "modul tidak aktif". */
export const PESAN_MODUL_KESEHATAN_MATI = 'Modul Kesehatan tidak aktif di desa ini.'

export const LABEL_MODUL: Readonly<Record<keyof ModulDesa, string>> = { kesehatan: 'Kesehatan (Posyandu)' }

/** Nama modul yang menyala, urut tetap; kosong bila belum ada. Dipakai Konsol (tanpa isi data desa). */
export const modulAktif = (modul: ModulDesa): string[] =>
  (Object.keys(LABEL_MODUL) as (keyof ModulDesa)[]).filter((k) => modul[k]).map((k) => LABEL_MODUL[k])

/** Desa yang ditambah lewat Konsol memulai tanpa modul Kesehatan; Sekretaris Desa menyalakannya di Pengaturan. */
export const MODUL_BAWAAN_DESA_BARU: ModulDesa = { kesehatan: false }
