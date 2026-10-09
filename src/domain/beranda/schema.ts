import { z } from 'zod'
import { aktivitasSchema } from '../aktivitas/schema'

/**
 * "Perlu ditindaklanjuti" (SPEC §5.3). Butir laporan warga membawa laporan terlama yang belum ditangani; Tahap 2B
 * menambah jenis untuk surat dan pengaduan.
 */
export const tindakanSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('kelahiran-dilaporkan'), jumlah: z.number().int().min(1), laporanId: z.string() }),
  z.object({ jenis: z.literal('laporan-perbaikan'), jumlah: z.number().int().min(1), pendudukId: z.string() }),
  z.object({ jenis: z.literal('data-belum-lengkap'), jumlah: z.number().int().min(1) }),
])
export type Tindakan = z.infer<typeof tindakanSchema>

const jumlah = z.number().int().min(0)

/** Keadaan desa (atau dusun, untuk Kepala Dusun) dalam bentuk kalimat. */
export const keadaanSchema = z.object({
  cakupan: z.enum(['desa', 'dusun']),
  dusunId: z.string().nullable(),
  jiwa: jumlah,
  kk: jumlah,
  laki: jumlah,
  perempuan: jumlah,
  bulanIni: z.object({ lahir: jumlah, meninggal: jumlah, datang: jumlah, pindah: jumlah }),
})
export type Keadaan = z.infer<typeof keadaanSchema>

/** GET /beranda. Bagian bernilai null tidak ditampilkan untuk peran tersebut. */
export const berandaSchema = z.object({
  tindakan: z.array(tindakanSchema).nullable(),
  bukuHariIni: z.array(aktivitasSchema).nullable(),
  keadaan: keadaanSchema,
})
export type Beranda = z.infer<typeof berandaSchema>
