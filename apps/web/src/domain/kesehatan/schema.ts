import { z } from 'zod'
import { HARI } from '../format/tanggal'
import { JENIS_KELAMIN } from '../penduduk/enum'

/** SPEC §8: status dihitung pembangkit data, layar hanya menampilkan. */
export const STATUS_GIZI = ['normal', 'perlu-pemantauan', 'pendek'] as const
export type StatusGizi = (typeof STATUS_GIZI)[number]
export const LABEL_STATUS_GIZI: Readonly<Record<StatusGizi, string>> = {
  normal: 'Normal',
  'perlu-pemantauan': 'Perlu pemantauan',
  pendek: 'Pendek (stunting)',
}

const jumlah = z.number().int().min(0)

/** "Selasa pekan kedua": hari 0 = Minggu, seperti `Date.getDay()`. */
export const aturanJadwalSchema = z.object({ pekanKe: z.number().int().min(1).max(4), hari: z.number().int().min(0).max(6) })
export type AturanJadwal = z.infer<typeof aturanJadwalSchema>

/** Satu posyandu per dusun (SPEC §12.2). */
export const posyanduSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  dusunId: z.string(),
  nama: z.string().min(1),
  tempat: z.string().min(1),
  jadwal: aturanJadwalSchema,
})
export type Posyandu = z.infer<typeof posyanduSchema>

/** GET /kesehatan/posyandu: jadwal dihitung dari tanggal hari ini; jumlah balita dalam cakupan pengguna. */
export const ringkasPosyanduSchema = posyanduSchema.extend({
  jadwalBulanIni: z.iso.date(),
  jadwalBerikut: z.iso.date(),
  jumlahBalita: jumlah,
  perluPemantauan: jumlah,
  pendek: jumlah,
})
export type RingkasPosyandu = z.infer<typeof ringkasPosyanduSchema>

export const pengukuranSchema = z.object({ tanggal: z.iso.date(), beratKg: z.number().positive(), tinggiCm: z.number().positive() })
export type Pengukuran = z.infer<typeof pengukuranSchema>

/** Balita (0-4 tahun) beserta pengukurannya. `id` adalah ID penduduk. */
export const barisBalitaSchema = z.object({
  id: z.string(),
  nama: z.string(),
  jenisKelamin: z.enum(JENIS_KELAMIN),
  tanggalLahir: z.iso.date(),
  umurBulan: jumlah,
  /** `id` null bila ibunya tidak tercatat sebagai penduduk desa ini. */
  ibu: z.object({ id: z.string().nullable(), nama: z.string() }),
  dusunId: z.string(),
  posyanduId: z.string(),
  /** Urut dari yang paling lama. */
  pengukuran: z.array(pengukuranSchema),
  /** Null bila belum pernah diukur, mis. bayi yang baru lahir. */
  status: z.enum(STATUS_GIZI).nullable(),
})
export type BarisBalita = z.infer<typeof barisBalitaSchema>

/** GET /kesehatan/balita. */
export const filterBalitaSchema = z.object({
  posyandu: z.string().optional(),
  status: z.enum(STATUS_GIZI).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterBalita = z.infer<typeof filterBalitaSchema>

/** Tanggal posyandu pada bulan "YYYY-MM", mis. Selasa pekan kedua. */
export function jadwalPosyandu(aturan: AturanJadwal, bulan: string): string {
  const [tahun, b] = bulan.split('-').map(Number)
  const hariPertama = new Date(Date.UTC(tahun, b - 1, 1)).getUTCDay()
  const tanggal = 1 + ((aturan.hari - hariPertama + 7) % 7) + 7 * (aturan.pekanKe - 1)
  return `${bulan}-${String(tanggal).padStart(2, '0')}`
}

/** Jadwal terdekat mulai hari ini: bulan ini bila belum lewat, selain itu bulan depan. */
export function jadwalBerikut(aturan: AturanJadwal, hariIni: string): string {
  const bulanIni = hariIni.slice(0, 7)
  const ini = jadwalPosyandu(aturan, bulanIni)
  if (ini >= hariIni) return ini
  const [tahun, bulan] = bulanIni.split('-').map(Number)
  return jadwalPosyandu(aturan, bulan === 12 ? `${tahun + 1}-01` : `${tahun}-${String(bulan + 1).padStart(2, '0')}`)
}

const PEKAN = ['pertama', 'kedua', 'ketiga', 'keempat'] as const

export const teksJadwal = (aturan: AturanJadwal): string => `${HARI[aturan.hari]} pekan ${PEKAN[aturan.pekanKe - 1]}`
