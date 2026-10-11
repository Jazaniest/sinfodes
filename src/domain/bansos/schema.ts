import { z } from 'zod'
import { angkaRomawi } from '../format/romawi'

export const STATUS_PENYALURAN = ['tersalur', 'belum-diambil', 'dijadwalkan', 'ditahan'] as const
export type StatusPenyaluran = (typeof STATUS_PENYALURAN)[number]

const tanggal = z.iso.date()
const nomor3 = z.string().regex(/^\d{3}$/)

export const tahapBansosSchema = z.object({ ke: z.number().int().min(1), periode: z.string().min(1), jadwal: tanggal })
export type TahapBansos = z.infer<typeof tahapBansosSchema>

/** Program bantuan sosial (SPEC §8, §12.6). Hanya BLT Dana Desa yang dikelola desa; yang lain data kementerian. */
export const programBansosSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  nama: z.string().min(1),
  singkat: z.string().min(1),
  sumber: z.string().min(1),
  dikelolaDesa: z.boolean(),
  /** Mis. "Rp300.000 per bulan, dibayarkan per 3 bulan". */
  bentuk: z.string().min(1),
  tahap: z.array(tahapBansosSchema).min(1),
})
export type ProgramBansos = z.infer<typeof programBansosSchema>

/** GET /bansos/program: jumlah dihitung dalam cakupan pengguna (Kepala Dusun: dusunnya). */
export const ringkasProgramSchema = programBansosSchema.extend({
  jumlahPenerima: z.number().int().min(0),
  perluDitinjau: z.number().int().min(0),
})
export type RingkasProgram = z.infer<typeof ringkasProgramSchema>

/** Keluarga penerima manfaat (KPM). `penyaluran[i]` adalah status tahap ke-(i+1). */
export const penerimaBansosSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  programId: z.string(),
  keluargaId: z.string(),
  nomorKk: z.string().regex(/^\d{16}$/),
  dusunId: z.string(),
  rw: nomor3,
  rt: nomor3,
  atasNama: z.object({ pendudukId: z.string(), nama: z.string() }),
  /** Desil DTSEN; penerima di desa demo berada di desil 1–4. */
  desil: z.number().int().min(1).max(4),
  penyaluran: z.array(z.enum(STATUS_PENYALURAN)).min(1),
  /** Diisi saat penerimanya meninggal atau pindah (SPEC §6.6). */
  perluDitinjau: z.object({ alasan: z.string().min(1), sejak: z.iso.datetime({ offset: true }) }).nullable(),
})
export type PenerimaBansos = z.infer<typeof penerimaBansosSchema>

/** GET /bansos/program/:id/penerima. */
export const filterPenerimaSchema = z.object({
  dusun: z.coerce.number().int().min(1).optional(),
  tampil: z.enum(['semua', 'perlu-ditinjau']).default('semua'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterPenerima = z.infer<typeof filterPenerimaSchema>

/** GET /bansos/keluarga/:id: program yang diterima satu keluarga, untuk tab Bantuan di profil penduduk. */
export const bantuanKeluargaSchema = z.array(z.object({ program: programBansosSchema, penerima: penerimaBansosSchema }))
export type BantuanKeluarga = z.infer<typeof bantuanKeluargaSchema>

export const labelTahap = (ke: number): string => `Tahap ${angkaRomawi(ke)}`

/** Tahap terdekat yang belum lewat; jadwal hari ini masih dihitung. Null bila semua tahap tahun ini sudah lewat. */
export function tahapBerikutnya(program: Pick<ProgramBansos, 'tahap'>, hariIni: string): TahapBansos | null {
  return program.tahap.find((t) => t.jadwal >= hariIni) ?? null
}

/** Penerima yang perlu ditinjau: penyaluran yang belum terjadi ditahan sampai ditinjau ulang. */
export function tahanPenyaluran(penyaluran: readonly StatusPenyaluran[]): StatusPenyaluran[] {
  return penyaluran.map((s) => (s === 'dijadwalkan' ? 'ditahan' : s))
}
