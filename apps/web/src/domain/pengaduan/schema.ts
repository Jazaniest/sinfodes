import { z } from 'zod'
import { pelakuSchema } from '../mutasi/schema'

/** SPEC §8. */
export const KATEGORI_PENGADUAN = ['Infrastruktur', 'Pelayanan', 'Lingkungan', 'Keamanan', 'Bantuan sosial', 'Lainnya'] as const
export type KategoriPengaduan = (typeof KATEGORI_PENGADUAN)[number]

export const STATUS_PENGADUAN = ['baru', 'ditanggapi', 'selesai'] as const
export type StatusPengaduan = (typeof STATUS_PENGADUAN)[number]
export const LABEL_STATUS_PENGADUAN: Readonly<Record<StatusPengaduan, string>> = { baru: 'Baru', ditanggapi: 'Ditanggapi', selesai: 'Selesai' }

const waktu = z.iso.datetime({ offset: true })

/** Foto dari warga: nama dan ukuran berkasnya saja, seperti scan surat masuk. */
const fotoSchema = z.object({ berkas: z.string().min(1), ukuranKb: z.number().int().min(1) })

/** Satu entri percakapan, urut waktu: pesan warga, balasan desa, atau perubahan status oleh petugas. */
export const entriPengaduanSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('warga'), id: z.string(), waktu, isi: z.string().min(1), foto: fotoSchema.nullable() }),
  z.object({ jenis: z.literal('desa'), id: z.string(), waktu, isi: z.string().min(1), oleh: pelakuSchema, jabatan: z.string().min(1) }),
  z.object({ jenis: z.literal('status'), id: z.string(), waktu, status: z.enum(STATUS_PENGADUAN), oleh: pelakuSchema }),
])
export type EntriPengaduan = z.infer<typeof entriPengaduanSchema>

/** Pengaduan warga (SPEC §8). Percakapannya selalu dimulai pesan warga. */
export const pengaduanSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  /** Untuk membatasi Kepala Dusun. */
  dusunId: z.string(),
  nomor: z.string().regex(/^ADU-\d{4}-\d{3}$/),
  judul: z.string().min(1),
  kategori: z.enum(KATEGORI_PENGADUAN),
  pelapor: z.object({ pendudukId: z.string(), nama: z.string() }),
  /** Keterangan tempat dari warga, mis. "Jalan lingkungan RT 012, dekat surau". */
  lokasi: z.string().nullable(),
  masukPada: waktu,
  status: z.enum(STATUS_PENGADUAN),
  tanggapanPertamaPada: waktu.nullable(),
  selesaiPada: waktu.nullable(),
  percakapan: z.array(entriPengaduanSchema).min(1),
})
export type Pengaduan = z.infer<typeof pengaduanSchema>

/** Baris kotak masuk: tanpa percakapan. */
export const barisPengaduanSchema = pengaduanSchema.omit({ percakapan: true })
export type BarisPengaduan = z.infer<typeof barisPengaduanSchema>

/** GET /pengaduan. Dusun memakai nomornya, seperti filter penduduk. */
export const filterPengaduanSchema = z.object({
  status: z.enum(STATUS_PENGADUAN).default('baru'),
  kategori: z.enum(KATEGORI_PENGADUAN).optional(),
  dusun: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterPengaduan = z.infer<typeof filterPengaduanSchema>

/** GET /pengaduan/jumlah: angka tab, dan angka menu (Baru) untuk peran yang menanggapi. */
export const jumlahPengaduanSchema = z.object({ status: z.record(z.enum(STATUS_PENGADUAN), z.number().int().min(0)) })
export type JumlahPengaduan = z.infer<typeof jumlahPengaduanSchema>

/** POST /pengaduan/:id/balasan. */
export const balasanPengaduanSchema = z.object({
  isi: z.string().trim().min(1, 'Balasan wajib diisi').max(1000, 'Balasan paling banyak 1.000 karakter'),
})

/** POST /pengaduan/:id/status. Baru tidak bisa dipilih: statusnya hilang sendiri saat balasan pertama. */
export const ubahStatusPengaduanSchema = z.object({ status: z.enum(['ditanggapi', 'selesai']) })
export type StatusTujuan = z.infer<typeof ubahStatusPengaduanSchema>['status']

/** Pesan bila perpindahan status tidak boleh, null bila boleh. Ditanggapi → Selesai, dan Selesai → Ditanggapi (buka kembali). */
export function periksaUbahStatus(dari: StatusPengaduan, ke: StatusTujuan): string | null {
  if (dari === ke) return `Pengaduan sudah berstatus ${LABEL_STATUS_PENGADUAN[ke]}.`
  if (dari === 'baru') {
    return ke === 'selesai' ? 'Balas warga lebih dulu sebelum menandai selesai.' : 'Status menjadi Ditanggapi setelah balasan pertama dikirim.'
  }
  return null
}

const JAM_MS = 3_600_000

/** "kurang dari 1 jam", "5 jam", "2 hari". */
export function formatLama(mulai: string, sampai: string): string {
  const jam = Math.max(0, new Date(sampai).getTime() - new Date(mulai).getTime()) / JAM_MS
  if (jam < 1) return 'kurang dari 1 jam'
  if (jam < 24) return `${Math.floor(jam)} jam`
  return `${Math.floor(jam / 24)} hari`
}

/** Kolom "Tanggapan pertama": lamanya, atau "belum dibalas · 3 jam" selama masih menunggu. */
export function teksTanggapanPertama(
  b: Pick<BarisPengaduan, 'masukPada' | 'tanggapanPertamaPada'>,
  sekarang: Date,
): { teks: string; menunggu: boolean } {
  if (b.tanggapanPertamaPada) return { teks: formatLama(b.masukPada, b.tanggapanPertamaPada), menunggu: false }
  return { teks: `belum dibalas · ${formatLama(b.masukPada, sekarang.toISOString())}`, menunggu: true }
}
