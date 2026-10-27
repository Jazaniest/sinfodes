import { daftarBulanTerakhir, hitungUmur, tanggalIsoWib } from '@/domain/format/tanggal'
import { jadwalPosyandu, type AturanJadwal, type Pengukuran, type Posyandu, type StatusGizi } from '@/domain/kesehatan/schema'
import type { JenisKelamin } from '@/domain/penduduk/enum'
import type { Penduduk } from '@/domain/penduduk/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { Acak } from '../prng'
import type { PengukuranBalita } from '../tipe-db'

type Opsi = { desa: Desa; dusun: readonly Dusun[]; penduduk: readonly Penduduk[]; acuan: Date }

/** Hari posyandu menurut nomor dusun: Selasa dan Rabu pekan kedua, Selasa dan Kamis pekan ketiga. */
const ATURAN: Readonly<Record<number, AturanJadwal>> = {
  1: { pekanKe: 2, hari: 2 },
  2: { pekanKe: 2, hari: 3 },
  3: { pekanKe: 3, hari: 2 },
  4: { pekanKe: 3, hari: 4 },
}
const ATURAN_LAIN: AturanJadwal = { pekanKe: 2, hari: 2 }

/** Anak Siti Rahmah tumbuh normal dan selalu datang ke posyandu (layanan warga, Tahap 4). */
const BALITA_PERSONA = 'pdk_muhammad_alif'

/** Median kasar berat (kg) dan tinggi (cm) menurut umur dalam bulan: cukup untuk data demo yang masuk akal. */
function beratMedian(bulan: number, jk: JenisKelamin): number {
  const berat = bulan < 12 ? 3.3 + 0.55 * bulan : 9.9 + 0.2 * (bulan - 12)
  return jk === 'P' ? berat * 0.95 : berat
}
function tinggiMedian(bulan: number, jk: JenisKelamin): number {
  const tinggi = bulan < 12 ? 50 + 2.1 * bulan : bulan < 24 ? 75.2 + 0.95 * (bulan - 12) : 86.6 + 0.7 * (bulan - 24)
  return jk === 'P' ? tinggi - 1.2 : tinggi
}
const FAKTOR: Readonly<Record<StatusGizi, { berat: number; tinggi: number }>> = {
  normal: { berat: 1, tinggi: 1 },
  'perlu-pemantauan': { berat: 0.86, tinggi: 0.97 },
  pendek: { berat: 0.88, tinggi: 0.91 },
}
const satuDesimal = (x: number) => Math.round(x * 10) / 10

/** 4 posyandu dan pengukuran bulanan 12 bulan terakhir untuk setiap balita (SPEC §12.6): sekitar 85% normal. */
export function bangkitkanKesehatan(acak: Acak, o: Opsi): { posyandu: Posyandu[]; pengukuranBalita: PengukuranBalita[] } {
  const hariIni = tanggalIsoWib(o.acuan)
  const posyandu = o.dusun
    .filter((d) => d.desaId === o.desa.id)
    .map(
      (d): Posyandu => ({
        id: `psy_${d.id.replace(/^dsn_/, '')}`, desaId: o.desa.id, dusunId: d.id, nama: `Posyandu ${d.posyandu}`,
        tempat: `Gedung Posyandu ${d.posyandu}, ${namaDusun(d, o.desa.istilahWilayah)}`, jadwal: ATURAN[d.nomor] ?? ATURAN_LAIN,
      }),
    )
  const aturanDusun = new Map(posyandu.map((p) => [p.dusunId, p.jadwal]))
  const bulan = daftarBulanTerakhir(o.acuan, 12).reverse()
  const balita = o.penduduk.filter(
    (p) => p.desaId === o.desa.id && p.statusDasar === 'Hidup' && hitungUmur(p.tanggalLahir, o.acuan).tahun <= 4,
  )
  const pengukuranBalita = balita.map((p): PengukuranBalita => {
    const persona = p.id === BALITA_PERSONA
    const status = persona ? 'normal' : acak.berbobot<StatusGizi>([['normal', 85], ['perlu-pemantauan', 9], ['pendek', 6]])
    const faktor = FAKTOR[status]
    // Tiap anak punya garis tumbuhnya sendiri; berat bergeser sedikit setiap bulan, tinggi tidak pernah turun.
    const geserBerat = 0.95 + acak.angka() * 0.1
    const geserTinggi = 0.985 + acak.angka() * 0.03
    const aturan = aturanDusun.get(p.dusunId) ?? ATURAN_LAIN
    const pengukuran: Pengukuran[] = []
    for (const b of bulan) {
      const tanggal = jadwalPosyandu(aturan, b)
      if (tanggal > hariIni || tanggal < p.tanggalLahir || (!persona && acak.peluang(0.08))) continue
      const umur = hitungUmur(p.tanggalLahir, new Date(`${tanggal}T03:00:00Z`)).bulan
      pengukuran.push({
        tanggal,
        beratKg: satuDesimal(beratMedian(umur, p.jenisKelamin) * faktor.berat * geserBerat * (0.99 + acak.angka() * 0.02)),
        tinggiCm: satuDesimal(tinggiMedian(umur, p.jenisKelamin) * faktor.tinggi * geserTinggi),
      })
    }
    return { pendudukId: p.id, desaId: o.desa.id, pengukuran, status: pengukuran.length > 0 ? status : null }
  })
  return { posyandu, pengukuranBalita }
}
