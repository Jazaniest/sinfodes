import { hitungUmur, tanggalIsoWib } from '@/domain/format/tanggal'
import { ringkasDanaDesa, tertinggal, type DanaDesa, type DesaDanaDesa } from '@/domain/kabupaten/dana-desa'
import { KELOMPOK_UMUR, PROGRAM_GABUNGAN, type BarisMentah } from '@/domain/kabupaten/data-gabungan'
import { median, rasioApbdes } from '@/domain/kabupaten/pemantauan'
import { jumlahKelompok } from '@/domain/keuangan/schema'
import { KABUPATEN } from '@/domain/wilayah/kode-wilayah'
import type { Desa } from '@/domain/wilayah/schema'
import type { DbDemo } from './tipe-db'

/**
 * Angka per desa untuk dasbor kabupaten (SPEC-V0.2 §8.3). Desa dengan data panel dihitung dari datanya; desa rekaman
 * membaca rekamannya. Dana Desa, Peta, Ringkasan, dan Laporan memakai fungsi yang sama, jadi angkanya tidak bisa berbeda.
 */

export type BelanjaBulan = { bulan: string; belanja: number }
export type ApbdesDesa = { anggaran: number; realisasi: number; bulanan: BelanjaBulan[] }

const urutNama = (a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama, 'id')

/** Desa pelanggan di satu kabupaten (kode bertitik, mis. "14.05"). */
export const desaDiKabupaten = (db: DbDemo, kabupatenKode: string): Desa[] => db.desa.filter((d) => d.kabupaten.kode === kabupatenKode)

/** Belanja APBDes satu desa pada `tahun`, beserta belanja per bulannya; null bila desa belum punya APBDes tahun itu. */
export function apbdesDesa(db: DbDemo, desa: Desa, tahun: number): ApbdesDesa | null {
  const rekam = db.rekamDesa.find((r) => r.desaId === desa.id)
  if (rekam) {
    if (!rekam.apbdes || !rekam.belanjaBulanan || !rekam.belanjaBulanan.every((b) => b.bulan.startsWith(`${tahun}-`))) return null
    return { ...rekam.apbdes, bulanan: rekam.belanjaBulanan.map((b) => ({ ...b })) }
  }
  const apbdes = db.apbdes.find((a) => a.desaId === desa.id && a.tahun === tahun)
  if (!apbdes) return null
  return { ...jumlahKelompok(apbdes, 'belanja'), bulanan: apbdes.bulanan.map((b) => ({ bulan: b.bulan, belanja: b.belanja })) }
}

/** Realisasi belanja sampai akhir `bulan` ("YYYY-MM"). */
export const realisasiSampai = (bulanan: readonly BelanjaBulan[], bulan: string): number =>
  bulanan.reduce((n, b) => (b.bulan <= bulan ? n + b.belanja : n), 0)

/** Nama kabupaten dari kabupaten mitra, atau dari tabel kode wilayah. */
const namaKabupaten = (db: DbDemo, kode: string): string =>
  db.kabupatenMitra.find((k) => k.kode === kode)?.nama ?? KABUPATEN[kode.replace('.', '')] ?? kode

/** Dana Desa satu kabupaten pada tahun berjalan (SPEC-V0.2 §8.3 butir 4). */
export function danaDesaKabupaten(db: DbDemo, kabupatenKode: string, sekarang: Date): DanaDesa {
  const tahun = Number(tanggalIsoWib(sekarang).slice(0, 4))
  const desa = desaDiKabupaten(db, kabupatenKode).map((d) => {
    const a = apbdesDesa(db, d, tahun)
    return { d, apbdes: a ? { anggaran: a.anggaran, realisasi: a.realisasi } : null }
  })
  const medianRealisasi = median(desa.flatMap(({ apbdes }) => (apbdes && apbdes.anggaran > 0 ? [apbdes.realisasi / apbdes.anggaran] : [])))
  const perKecamatan = new Map<string, { kecamatan: Desa['kecamatan']; desa: DesaDanaDesa[] }>()
  for (const { d, apbdes } of desa) {
    const k = perKecamatan.get(d.kecamatan.kode) ?? { kecamatan: d.kecamatan, desa: [] }
    k.desa.push({ id: d.id, nama: d.nama, alamat: d.slug, status: d.status, apbdes, tertinggal: tertinggal(rasioApbdes(apbdes), medianRealisasi) })
    perKecamatan.set(d.kecamatan.kode, k)
  }
  const kecamatan = [...perKecamatan.values()]
    .sort((a, b) => urutNama(a.kecamatan, b.kecamatan))
    .map((k) => ({ kecamatan: k.kecamatan, ...ringkasDanaDesa(k.desa), desa: [...k.desa].sort(urutNama) }))
  return {
    kabupaten: { kode: kabupatenKode, nama: namaKabupaten(db, kabupatenKode) },
    tahun,
    medianRealisasi,
    total: ringkasDanaDesa(kecamatan.flatMap((k) => k.desa)),
    kecamatan,
  }
}

/** Desa sasaran tenggat laporan (keputusan rencana 7B-2): desa Aktif dan Uji coba di kabupaten itu. */
export const desaSasaranTenggat = (db: DbDemo, kabupatenKode: string): Desa[] =>
  desaDiKabupaten(db, kabupatenKode).filter((d) => d.status === 'Aktif' || d.status === 'Uji coba')

/**
 * Angka gabungan mentah satu desa untuk Data gabungan (SPEC-V0.2 §8.3 butir 6), sebelum disamarkan. Desa panel: penduduk
 * Hidup, KK yang masih punya anggota (sama dengan Beranda), umur dalam tahun penuh pada `sekarang`, dan penerima program
 * bansos menurut nama singkatnya. Null bila desa belum punya penduduk.
 */
export function komposisiDesa(db: DbDemo, desa: Desa, sekarang: Date): BarisMentah | null {
  const rekam = db.rekamDesa.find((r) => r.desaId === desa.id)
  if (rekam) return rekam.komposisi && rekam.jiwa > 0 ? { ...rekam.komposisi, jiwa: rekam.jiwa } : null
  const hidup = db.penduduk.filter((p) => p.desaId === desa.id && p.statusDasar === 'Hidup')
  if (hidup.length === 0) return null
  const umur = (u: (typeof KELOMPOK_UMUR)[number]) =>
    hidup.filter((p) => {
      const t = hitungUmur(p.tanggalLahir, sekarang).tahun
      return t >= u.dari && (u.sampai === null || t <= u.sampai)
    }).length
  const penerima = (singkat: string) => {
    const program = new Set(db.programBansos.filter((p) => p.desaId === desa.id && p.singkat === singkat).map((p) => p.id))
    return db.penerimaBansos.filter((x) => x.desaId === desa.id && program.has(x.programId)).length
  }
  const hasil = Object.fromEntries([
    ['laki', hidup.filter((p) => p.jenisKelamin === 'L').length],
    ['perempuan', hidup.filter((p) => p.jenisKelamin === 'P').length],
    ['jiwa', hidup.length],
    ['kk', db.keluarga.filter((k) => k.desaId === desa.id && k.anggotaIds.length > 0).length],
    ...KELOMPOK_UMUR.map((u) => [u.kunci, umur(u)]),
    ...PROGRAM_GABUNGAN.map((p) => [p.kunci, penerima(p.singkat)]),
  ])
  return hasil as BarisMentah
}

/**
 * Desa bergabung pada `tanggal` ("YYYY-MM-DD"), dari masa langganannya: untuk Laporan bulanan bulan lampau. Langganan hanya
 * dibaca di sini; paket dan tagihannya tidak pernah dikirim ke kabupaten (SPEC-V0.2 §5.1).
 */
export function bergabungPada(db: DbDemo, desa: Desa, tanggal: string): boolean {
  const l = db.langganan.find((x) => x.desaId === desa.id)
  return l?.mulai != null && l.mulai <= tanggal && (l.sampai === null || l.sampai >= tanggal)
}

/** Surat Selesai yang terbit sepanjang `bulan` ("YYYY-MM"), sama dengan definisi Pemantauan. */
export function suratTerbitBulan(db: DbDemo, desa: Desa, bulan: string): number {
  const rekam = db.rekamDesa.find((r) => r.desaId === desa.id)
  if (rekam) return rekam.suratPerBulan.find((s) => s.bulan === bulan)?.jumlah ?? 0
  return db.permohonan.filter(
    (p) => p.desaId === desa.id && p.status === 'selesai' && p.terbit !== null && tanggalIsoWib(new Date(p.terbit.pada)).startsWith(bulan),
  ).length
}
