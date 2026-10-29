import { JENIS_MUTASI_SURAT, saranDariMutasi } from '@sinfodes/kontrak/surat/saran'
import { saranSuratSchema, type SaranSurat } from '@sinfodes/kontrak/surat/permohonan'
import type { Penduduk } from '@sinfodes/kontrak/penduduk/schema'
import { z } from 'zod'
import { GalatApp } from '../../galat'
import { bentukMutasi } from '../mutasi/layanan'
import { bacaMutasiPenduduk, bacaMutasiSatu } from '../mutasi/repositori'
import { bacaJenisDesa } from '../jenis-surat/repositori'
import { namaPejabat } from '../pengaturan-surat/pejabat'
import { bacaPengaturanSurat } from '../pengaturan-surat/repositori'
import { bentukPenduduk, type KonteksLayanan } from '../penduduk/layanan'
import { bacaPendudukSatu } from '../penduduk/repositori'
import { bacaAnggotaKeluarga, bacaPendudukIds } from './repositori'

export const kueriSaranSchema = z.object({
  jenis: z.string().regex(/^[A-Z]{2,5}$/),
  pemohon: z.string().optional(),
  subjek: z.string().optional(),
})
export type KueriSaran = z.infer<typeof kueriSaranSchema>

/**
 * Bahan surat baru di loket (SPEC §6.6): isian awal dari mutasi terbaru orang itu yang sesuai jenis suratnya (kelahiran,
 * kematian, kepindahan), ditambah pengaturan surat dan pejabat untuk pratinjau lembar. Tanpa mutasi yang cocok saran kosong.
 * Orang yang tidak dikenal (atau milik desa lain, disembunyikan RLS) diperlakukan seperti tanpa orang.
 */
export async function saranSurat(k: Pick<KonteksLayanan, 'db' | 'penyandi'>, desaId: string, mentah: unknown): Promise<SaranSurat> {
  const kueri = kueriSaranSchema.safeParse(mentah)
  if (!kueri.success) throw new GalatApp('VALIDATION', 'Permintaan saran tidak valid.', 422)
  const jenis = (await bacaJenisDesa(k.db)).find((j) => j.kode === kueri.data.jenis)
  if (!jenis) throw new GalatApp('NOT_FOUND', 'Jenis surat tidak ditemukan.', 404)

  const orangId = kueri.data.subjek ?? kueri.data.pemohon
  const orang = orangId === undefined ? undefined : await bacaPendudukSatu(k.db, orangId, null)
  const jenisMutasi = JENIS_MUTASI_SURAT[jenis.kode]
  // Mutasi terbaru orang itu yang sesuai jenis suratnya; seri waktu yang sama diputus ID.
  const calon = orang && jenisMutasi ? (await bacaMutasiPenduduk(k.db, orang.id)).filter((m) => m.jenis === jenisMutasi) : []
  const terpilih = calon.at(-1)
  const lengkap = terpilih ? await bacaMutasiSatu(k.db, terpilih.id) : undefined
  const mutasi = lengkap ? bentukMutasi(lengkap.rekam, lengkap.pendudukIds) : null

  // Orang yang disebut mutasi (orang tua bayi, daftar yang pindah) dan anggota KK orang itu, dibaca sekali.
  const keluarga = orang ? await bacaAnggotaKeluarga(k.db, orang.keluargaId) : []
  const perluId = new Set<string>(mutasi?.pendudukIds ?? [])
  if (mutasi?.jenis === 'lahir') for (const id of [mutasi.rincian.ayahId, mutasi.rincian.ibuId]) if (id) perluId.add(id)
  const lain = await bacaPendudukIds(k.db, [...perluId])
  const peta = new Map<string, Penduduk>([...keluarga, ...lain].map((r) => [r.id, bentukPenduduk(r, k.penyandi)]))

  const saran = saranDariMutasi(jenis, mutasi, (id) => peta.get(id), keluarga.map((r) => peta.get(r.id) as Penduduk))
  return saranSuratSchema.parse({
    mutasi,
    pemohonId: saran.pemohonId,
    isian: saran.isian,
    pengaturan: await bacaPengaturanSurat(k.db, desaId),
    pejabat: await namaPejabat(k.db, desaId),
  })
}
