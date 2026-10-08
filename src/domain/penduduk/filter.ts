import { z } from 'zod'
import { hitungUmur } from '../format/tanggal'
import { AGAMA, JENIS_KELAMIN, PEKERJAAN, PENDIDIKAN, STATUS_DASAR, STATUS_PERKAWINAN } from './enum'
import type { Penduduk } from './schema'

export const PRESET_PENDUDUK = ['wajib-ktp-belum-rekam', 'balita', 'lansia', 'pendatang-tahun-ini', 'data-belum-lengkap'] as const
export type PresetPenduduk = (typeof PRESET_PENDUDUK)[number]

export const LABEL_PRESET: Readonly<Record<PresetPenduduk, string>> = {
  'wajib-ktp-belum-rekam': 'Wajib KTP belum rekam',
  balita: 'Balita',
  lansia: 'Lansia',
  'pendatang-tahun-ini': 'Pendatang tahun ini',
  'data-belum-lengkap': 'Data belum lengkap',
}

export const URUTAN_PENDUDUK = ['nama', 'umur', 'dusun', 'diubah'] as const
export type UrutanPenduduk = (typeof URUTAN_PENDUDUK)[number]

/** Filter terstruktur (boleh masuk URL). Pencarian teks bebas TIDAK di sini (SPEC §3.1). */
export const filterPendudukSchema = z.object({
  dusun: z.coerce.number().int().min(1).optional(),
  rt: z.string().regex(/^\d{3}$/).optional(),
  jk: z.enum(JENIS_KELAMIN).optional(),
  umurMin: z.coerce.number().int().min(0).max(150).optional(),
  umurMax: z.coerce.number().int().min(0).max(150).optional(),
  agama: z.enum(AGAMA).optional(),
  pendidikan: z.enum(PENDIDIKAN).optional(),
  pekerjaan: z.enum(PEKERJAAN).optional(),
  kawin: z.enum(STATUS_PERKAWINAN).optional(),
  status: z.enum(STATUS_DASAR).default('Hidup'),
  preset: z.enum(PRESET_PENDUDUK).optional(),
  urut: z.enum(URUTAN_PENDUDUK).default('nama'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterPenduduk = z.infer<typeof filterPendudukSchema>

export type KonteksSaring = {
  hariIni: Date
  dusunIdPerNomor: ReadonlyMap<number, string>
  idPendatangTahunIni: ReadonlySet<string>
}

/** SPEC §6.2: field wajib kosong, atau belum punya NIK padahal sudah ≥ 3 bulan. */
export function dataBelumLengkap(p: Penduduk, hariIni: Date): boolean {
  if (p.pendidikan === null || p.pekerjaan === null || p.statusPerkawinan === null) return true
  return p.nik === null && hitungUmur(p.tanggalLahir, hariIni).bulan >= 3
}

/** SPEC §6.2: wajib KTP-el = umur ≥ 17 atau pernah kawin; belum rekam. */
export function wajibKtpBelumRekam(p: Penduduk, hariIni: Date): boolean {
  const pernahKawin = p.statusPerkawinan !== null && p.statusPerkawinan !== 'Belum Kawin'
  return (hitungUmur(p.tanggalLahir, hariIni).tahun >= 17 || pernahKawin) && p.ktpEl === 'Belum rekam'
}

export function cocokPreset(p: Penduduk, preset: PresetPenduduk, ctx: KonteksSaring): boolean {
  const umur = hitungUmur(p.tanggalLahir, ctx.hariIni).tahun
  switch (preset) {
    case 'wajib-ktp-belum-rekam':
      return wajibKtpBelumRekam(p, ctx.hariIni)
    case 'balita':
      return umur <= 4
    case 'lansia':
      return umur >= 60
    case 'pendatang-tahun-ini':
      return ctx.idPendatangTahunIni.has(p.id)
    case 'data-belum-lengkap':
      return dataBelumLengkap(p, ctx.hariIni)
  }
}

export function saringPenduduk(semua: readonly Penduduk[], f: FilterPenduduk, ctx: KonteksSaring): Penduduk[] {
  const dusunId = f.dusun === undefined ? undefined : (ctx.dusunIdPerNomor.get(f.dusun) ?? '—tidak ada—')
  return semua.filter((p) => {
    if (p.statusDasar !== f.status) return false
    if (dusunId !== undefined && p.dusunId !== dusunId) return false
    if (f.rt !== undefined && p.rt !== f.rt) return false
    if (f.jk !== undefined && p.jenisKelamin !== f.jk) return false
    if (f.agama !== undefined && p.agama !== f.agama) return false
    if (f.pendidikan !== undefined && p.pendidikan !== f.pendidikan) return false
    if (f.pekerjaan !== undefined && p.pekerjaan !== f.pekerjaan) return false
    if (f.kawin !== undefined && p.statusPerkawinan !== f.kawin) return false
    if (f.umurMin !== undefined || f.umurMax !== undefined) {
      const umur = hitungUmur(p.tanggalLahir, ctx.hariIni).tahun
      if (f.umurMin !== undefined && umur < f.umurMin) return false
      if (f.umurMax !== undefined && umur > f.umurMax) return false
    }
    return f.preset === undefined || cocokPreset(p, f.preset, ctx)
  })
}

export function urutkanPenduduk(
  daftar: readonly Penduduk[],
  urut: UrutanPenduduk,
  ctx: { nomorDusun: (dusunId: string) => number },
): Penduduk[] {
  const namaAz = (a: Penduduk, b: Penduduk) => a.nama.localeCompare(b.nama, 'id')
  const salinan = [...daftar]
  switch (urut) {
    case 'nama':
      return salinan.sort(namaAz)
    case 'umur':
      return salinan.sort((a, b) => b.tanggalLahir.localeCompare(a.tanggalLahir) || namaAz(a, b))
    case 'dusun':
      return salinan.sort(
        (a, b) => ctx.nomorDusun(a.dusunId) - ctx.nomorDusun(b.dusunId) || a.rt.localeCompare(b.rt) || namaAz(a, b),
      )
    case 'diubah':
      return salinan.sort((a, b) => b.diubahPada.localeCompare(a.diubahPada) || namaAz(a, b))
  }
}
