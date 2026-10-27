import { z } from 'zod'
import { formatAngka } from '../format/angka'
import { formatBulan } from '../format/tanggal'
import { JENIS_MUTASI, mutasiSchema, type JenisMutasi, type Mutasi } from './schema'

/** Filter Buku Mutasi di URL (SPEC §6.6). */
export const filterMutasiSchema = z.object({
  jenis: z.enum(JENIS_MUTASI).optional(),
  bulan: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterMutasi = z.infer<typeof filterMutasiSchema>

/** Baris Buku Mutasi: mutasi beserta nama penduduknya. */
export const barisMutasiSchema = z.object({
  mutasi: mutasiSchema,
  penduduk: z.array(z.object({ id: z.string(), nama: z.string() })),
})
export type BarisMutasi = z.infer<typeof barisMutasiSchema>

const jumlah = z.number().int().min(0)
export const ringkasanMutasiSchema = z.object({
  bulan: z.string().regex(/^\d{4}-\d{2}$/),
  lahir: jumlah,
  meninggal: jumlah,
  pindah: jumlah,
  datang: jumlah,
})
export type RingkasanMutasi = z.infer<typeof ringkasanMutasiSchema>

/** Jumlah kejadian per jenis pada satu bulan ("YYYY-MM"). Dipakai Beranda dan Buku Mutasi. */
export function hitungMutasiBulan(
  mutasi: readonly Pick<Mutasi, 'jenis' | 'tanggal'>[],
  bulan: string,
): Record<JenisMutasi, number> {
  const hasil: Record<JenisMutasi, number> = { lahir: 0, meninggal: 0, pindah: 0, datang: 0 }
  for (const m of mutasi) if (m.tanggal.startsWith(bulan)) hasil[m.jenis] += 1
  return hasil
}

/** "September 2026: 3 lahir · 1 meninggal · 2 datang · 4 pindah" (SPEC §6.6). */
export function kalimatRingkasanMutasi(r: RingkasanMutasi): string {
  return `${formatBulan(r.bulan)}: ${r.lahir} lahir · ${r.meninggal} meninggal · ${r.datang} datang · ${r.pindah} pindah`
}

/** Rincian singkat satu mutasi untuk kolom tabel. */
export function rincianMutasi(m: Mutasi): string {
  switch (m.jenis) {
    case 'lahir':
      return `${m.rincian.tempatDilahirkan} · ${formatAngka(m.rincian.beratGram)} g · ${m.rincian.panjangCm} cm`
    case 'meninggal':
      return `${m.rincian.sebab} · ${m.rincian.tempat}`
    case 'pindah':
      return `Ke ${m.rincian.tujuan.kabupaten} · ${m.rincian.alasan}`
    case 'datang':
      return `Dari ${m.rincian.asal.kabupaten} · SKPWNI ${m.rincian.nomorSkpwni}`
  }
}
