import { z } from 'zod'
import { PENOLONG_KELAHIRAN, TEMPAT_DILAHIRKAN } from '../mutasi/enum'
import { pelakuSchema } from '../mutasi/schema'
import { JENIS_KELAMIN } from '../penduduk/enum'
import { teksNilaiRiwayat } from '../penduduk/perubahan'
import { LABEL_FIELD, type FieldRiwayat } from '../penduduk/riwayat'
import { pendudukSchema } from '../penduduk/schema'

/** Field yang boleh dilaporkan warga lewat "Ada data yang salah? Laporkan" (SPEC §10). NIK tidak termasuk. */
export const FIELD_LAPORAN = [
  'nama', 'tempatLahir', 'tanggalLahir', 'agama', 'golonganDarah', 'pendidikan', 'pekerjaan', 'statusPerkawinan',
  'namaAyah', 'namaIbu', 'telepon',
] as const satisfies readonly FieldRiwayat[]
export type FieldLaporan = (typeof FIELD_LAPORAN)[number]

export const STATUS_LAPORAN = ['baru', 'diterapkan', 'ditolak'] as const

const waktu = z.iso.datetime({ offset: true })
const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const isiLaporanSchema = z.discriminatedUnion('jenis', [
  z.object({
    jenis: z.literal('perbaikan'),
    pendudukId: z.string(),
    field: z.enum(FIELD_LAPORAN),
    nilaiBaru: z.string().min(1),
    catatan: z.string().nullable(),
  }),
  z.object({
    jenis: z.literal('kelahiran'),
    ibuId: z.string(),
    nama: z.string().min(1),
    jenisKelamin: z.enum(JENIS_KELAMIN),
    tanggalLahir: z.iso.date(),
    jam: jam.nullable(),
    tempatDilahirkan: z.enum(TEMPAT_DILAHIRKAN).nullable(),
    penolong: z.enum(PENOLONG_KELAHIRAN).nullable(),
    beratGram: z.number().int().nullable(),
    panjangCm: z.number().int().nullable(),
    catatan: z.string().nullable(),
  }),
])

/** Laporan dari warga: perbaikan satu field data, atau kelahiran yang belum dicatat desa (SPEC §5.3, §6.3, §10). */
export const laporanDataSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  /** Untuk membatasi Kepala Dusun. */
  dusunId: z.string(),
  dibuatPada: waktu,
  pelapor: z.object({ pendudukId: z.string(), nama: z.string() }),
  status: z.enum(STATUS_LAPORAN),
  ditangani: z.object({ oleh: pelakuSchema, pada: waktu, alasan: z.string().nullable() }).nullable(),
  /** Foto dokumen dari warga (opsional): nama dan ukurannya saja, seperti lampiran permohonan. */
  lampiran: z.object({ berkas: z.string().min(1), ukuranKb: z.number().int().min(1) }).nullable(),
  isi: isiLaporanSchema,
})
export type LaporanData = z.infer<typeof laporanDataSchema>
export type IsiPerbaikan = Extract<LaporanData['isi'], { jenis: 'perbaikan' }>
export type IsiKelahiran = Extract<LaporanData['isi'], { jenis: 'kelahiran' }>

/** "Warga melaporkan: pekerjaan seharusnya Wiraswasta" (SPEC §6.3). */
export function kalimatPerbaikan(isi: IsiPerbaikan): string {
  return `Warga melaporkan: ${LABEL_FIELD[isi.field].toLowerCase()} seharusnya ${teksNilaiRiwayat(isi.field, isi.nilaiBaru)}`
}

/** GET /laporan-data. */
export const filterLaporanSchema = z.object({
  status: z.enum(STATUS_LAPORAN).optional(),
  jenis: z.enum(['perbaikan', 'kelahiran']).optional(),
  pendudukId: z.string().optional(),
})
export type FilterLaporan = z.infer<typeof filterLaporanSchema>

/** POST /laporan-data/:id/tolak. Alasan tidak wajib. */
export const tolakLaporanSchema = z.object({ alasan: z.string().trim().max(300).nullable() })

/** POST /laporan-data/:id/terapkan. */
export const hasilTerapkanSchema = z.object({ laporan: laporanDataSchema, penduduk: pendudukSchema })
