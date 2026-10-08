import { z } from 'zod'
import { pelakuSchema } from '../mutasi/schema'

/** Jenis kejadian di Buku hari ini (SPEC §5.3). 2B menambah jenis surat. */
export const JENIS_AKTIVITAS = [
  'mutasi-lahir', 'mutasi-meninggal', 'mutasi-pindah', 'mutasi-datang', 'penduduk-ubah', 'penduduk-tambah',
  'keluarga-pecah', 'keluarga-ganti-kepala',
] as const
export type JenisAktivitas = (typeof JENIS_AKTIVITAS)[number]

export const aktivitasSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  /** Untuk membatasi Kepala Dusun; null berarti kejadian tingkat desa. */
  dusunId: z.string().nullable(),
  waktu: z.iso.datetime({ offset: true }),
  jenis: z.enum(JENIS_AKTIVITAS),
  ringkasan: z.string().min(1),
  oleh: pelakuSchema.nullable(),
  rujukan: z.object({ jenis: z.enum(['penduduk', 'keluarga']), id: z.string() }).nullable(),
})
export type Aktivitas = z.infer<typeof aktivitasSchema>
