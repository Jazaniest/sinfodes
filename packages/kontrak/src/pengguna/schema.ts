import { z } from 'zod'
import { modulDesaSchema } from '../pengaturan/modul'
import { desaSchema, dusunSchema } from '../wilayah/schema'

/** Lima peran akun desa (SPEC §5.1); hanya ini yang bisa diundang di Pengaturan › Pengguna. */
export const PERAN = ['operator', 'sekdes', 'kades', 'kaur-keuangan', 'kadus'] as const
export type Peran = (typeof PERAN)[number]
/** Peran yang bisa membawa sesi panel: peran desa, ditambah sesi bantuan Tim Sinfodes yang hanya melihat (SPEC-V0.2 §5.3). */
export const PERAN_SESI = [...PERAN, 'bantuan'] as const
export type PeranSesi = (typeof PERAN_SESI)[number]

export const LABEL_PERAN: Readonly<Record<PeranSesi, string>> = {
  operator: 'Operator',
  sekdes: 'Sekretaris Desa',
  kades: 'Kepala Desa',
  'kaur-keuangan': 'Kaur Keuangan',
  kadus: 'Kepala Dusun',
  bantuan: 'Tim Sinfodes (bantuan)',
}

export const PESAN_NIP = 'NIP 18 digit angka.'

const penggunaDasar = z.object({
  id: z.string(),
  desaId: z.string(),
  nama: z.string(),
  jabatan: z.string(),
  peran: z.enum(PERAN),
  dusunId: z.string().nullable(),
  email: z.string(),
  aktif: z.boolean(),
  /** NIP penanda tangan untuk blok tanda tangan surat (SPEC-V0.2 12.2); diisi Sekretaris Desa, boleh kosong. */
  nip: z.string().regex(/^\d{18}$/, PESAN_NIP).nullable(),
})
const dusunKadus = { message: 'Kepala dusun wajib punya dusun', path: ['dusunId'] }

export const penggunaSchema = penggunaDasar.refine((p) => p.peran !== 'kadus' || p.dusunId !== null, dusunKadus)
export type Pengguna = z.infer<typeof penggunaSchema>

/** Pengguna yang membawa sesi panel; `bantuan` adalah pengguna semu Tim Sinfodes, tidak tersimpan di daftar pengguna desa. */
export const penggunaSesiSchema = penggunaDasar
  .extend({ peran: z.enum(PERAN_SESI) })
  .refine((p) => p.peran !== 'kadus' || p.dusunId !== null, dusunKadus)
export type PenggunaSesi = z.infer<typeof penggunaSesiSchema>

/** Sesi admin membawa daftar dusun desanya: dipakai semua label alamat dan filter (SPEC §4.5). */
export const sesiAdminSchema = z.object({
  jenis: z.literal('admin'),
  pengguna: penggunaSesiSchema,
  desa: desaSchema,
  dusun: z.array(dusunSchema),
  /** Identitas desa di panel (rencana 7E-1): warna aksen untuk garis atas dan favicon (lambang desa, atau null untuk monogram). */
  tampilanPanel: z.object({ warnaAksen: z.string(), favicon: z.string().nullable() }).optional(),
  /** Modul desa yang menyala (SPEC-V0.2 12.3); tanpa isian berarti semua menyala. Selalu dikirim server. */
  modul: modulDesaSchema.optional(),
  /** Hanya untuk sesi bantuan Tim Sinfodes: batas waktu akses dan apakah data pribadi warga disamarkan (SPEC-V0.2 §5.3). */
  bantuan: z.object({ sampai: z.iso.datetime({ offset: true }), sembunyikanDataPribadi: z.boolean() }).nullable().optional(),
})
export type SesiAdmin = z.infer<typeof sesiAdminSchema>

/**
 * Hasil masuk panel. `token` hanya ada pada mode demo (API tiruan); server nyata menaruh sesi di cookie `HttpOnly` dan tidak
 * pernah mengirimkannya di badan jawaban (SPEC-V0.3 §8.1).
 */
export const hasilMasukSchema = z.object({ token: z.string().optional(), sesi: sesiAdminSchema })
export type HasilMasuk = z.infer<typeof hasilMasukSchema>
