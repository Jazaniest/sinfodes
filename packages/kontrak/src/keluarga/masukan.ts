import { z } from 'zod'
import { HUBUNGAN_KELUARGA, type HubunganKeluarga, type JenisKelamin } from '../penduduk/enum'

const nomor3 = z.string().regex(/^\d{3}$/)
const hubunganAnggota = z.enum(HUBUNGAN_KELUARGA).exclude(['Kepala Keluarga'])
export type HubunganAnggota = z.infer<typeof hubunganAnggota>
/** Semua hubungan selain kepala keluarga, untuk pilihan di dialog KK. */
export const HUBUNGAN_ANGGOTA = hubunganAnggota.options

/** POST /keluarga/:id/ganti-kepala (SPEC §6.5). */
export const gantiKepalaSchema = z.object({ kepalaBaruId: z.string().min(1), hubunganKepalaLama: hubunganAnggota })
export type GantiKepala = z.infer<typeof gantiKepalaSchema>

/** POST /keluarga/:id/pecah: anggota yang keluar membentuk KK baru (SPEC §6.5). */
export const pecahKeluargaSchema = z
  .object({
    anggotaIds: z.array(z.string().min(1)).min(1, 'Pilih minimal satu anggota'),
    kepalaBaruId: z.string().min(1),
    dusunId: z.string().min(1),
    rw: nomor3,
    rt: nomor3,
    /** Hubungan baru anggota selain kepala; yang tidak disebut tetap seperti semula. */
    hubungan: z.record(z.string(), hubunganAnggota).default({}),
  })
  .refine((p) => p.anggotaIds.includes(p.kepalaBaruId), {
    path: ['kepalaBaruId'],
    message: 'Kepala keluarga baru harus salah satu anggota yang keluar',
  })
export type PecahKeluarga = z.infer<typeof pecahKeluargaSchema>
/** Bentuk yang dikirim layar: `hubungan` boleh tidak ada. */
export type MasukanPecahKeluarga = z.input<typeof pecahKeluargaSchema>

/** Usulan hubungan di KK baru: menantu menjadi suami/istri, cucu menjadi anak, lainnya tetap. */
export function usulanHubunganPecah(p: { hubunganKeluarga: HubunganKeluarga; jenisKelamin: JenisKelamin }): HubunganAnggota {
  if (p.hubunganKeluarga === 'Menantu') return p.jenisKelamin === 'P' ? 'Istri' : 'Suami'
  if (p.hubunganKeluarga === 'Cucu') return 'Anak'
  if (p.hubunganKeluarga === 'Kepala Keluarga') return 'Famili Lain'
  return p.hubunganKeluarga
}

/** Usulan hubungan kepala lama setelah diganti, dilihat dari hubungan kepala baru terhadapnya. */
export function usulanHubunganKepalaLama(hubunganKepalaBaru: HubunganKeluarga): HubunganAnggota {
  if (hubunganKepalaBaru === 'Istri') return 'Suami'
  if (hubunganKepalaBaru === 'Suami') return 'Istri'
  if (hubunganKepalaBaru === 'Anak' || hubunganKepalaBaru === 'Menantu') return 'Orang Tua'
  return 'Famili Lain'
}
