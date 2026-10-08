import { z } from 'zod'
import { desaSchema, dusunSchema } from '../wilayah/schema'

export const PERAN = ['operator', 'sekdes', 'kades', 'kaur-keuangan', 'kadus'] as const
export type Peran = (typeof PERAN)[number]

export const LABEL_PERAN: Readonly<Record<Peran, string>> = {
  operator: 'Operator',
  sekdes: 'Sekretaris Desa',
  kades: 'Kepala Desa',
  'kaur-keuangan': 'Kaur Keuangan',
  kadus: 'Kepala Dusun',
}

export const penggunaSchema = z
  .object({
    id: z.string(),
    desaId: z.string(),
    nama: z.string(),
    jabatan: z.string(),
    peran: z.enum(PERAN),
    dusunId: z.string().nullable(),
    email: z.string(),
    aktif: z.boolean(),
  })
  .refine((p) => p.peran !== 'kadus' || p.dusunId !== null, { message: 'Kepala dusun wajib punya dusun', path: ['dusunId'] })
export type Pengguna = z.infer<typeof penggunaSchema>

/** Sesi admin membawa daftar dusun desanya: dipakai semua label alamat dan filter (SPEC §4.5). */
export const sesiAdminSchema = z.object({
  jenis: z.literal('admin'),
  pengguna: penggunaSchema,
  desa: desaSchema,
  dusun: z.array(dusunSchema),
})
export type SesiAdmin = z.infer<typeof sesiAdminSchema>
