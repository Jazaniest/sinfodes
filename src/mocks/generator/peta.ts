import type { Fasilitas, JenisFasilitas, PetaDesa, Titik } from '@/domain/peta/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

/**
 * Titik tengah desa fiktif, perkiraan di sekitar Teluk Meranti, Pelalawan. Peta tidak menampilkan nama tempat, jadi
 * desa fiktif ini tidak menimpa nama desa sungguhan (SPEC §8). Setel bila sungai besar tidak tepat di batas utara.
 */
export const PUSAT_PETA: Titik = [102.7, 0.28]
const ZOOM = 13.2

// Simpul bersama batas dusun (petak 2×2: Dusun I dan II di utara berbatas sungai, III dan IV di selatan).
const BL: Titik = [102.68, 0.298]
const BT: Titik = [102.72, 0.2992]
const TG: Titik = [102.7008, 0.2794]
const UT: Titik = [102.7, 0.2978]
const BR: Titik = [102.68, 0.2803]
const TM: Titik = [102.72, 0.2797]
const SL: Titik = [102.6995, 0.262]
const BD: Titik = [102.68, 0.262]
const TGR: Titik = [102.7205, 0.2615]

/** Batas per nomor dusun. Tepi utara berkelok mengikuti sungai. */
const BATAS: Readonly<Record<number, Titik[]>> = {
  1: [BL, [102.686, 0.2986], [102.693, 0.2971], UT, TG, BR, BL],
  2: [UT, [102.707, 0.2975], [102.714, 0.2989], BT, TM, TG, UT],
  3: [BR, TG, SL, BD, BR],
  4: [TG, TM, TGR, SL, TG],
}

type Butir = { jenis: JenisFasilitas; nama: string | ((d: Dusun) => string); dusun: number; titik: Titik; keterangan: string | null }

const FASILITAS: readonly Butir[] = [
  { jenis: 'kantor-desa', nama: 'Kantor Desa', dusun: 1, titik: [102.6905, 0.2885], keterangan: 'Pusat layanan administrasi desa' },
  { jenis: 'sekolah', nama: 'SD Negeri 012', dusun: 1, titik: [102.6872, 0.2851], keterangan: 'Sekolah dasar, 6 rombongan belajar' },
  { jenis: 'sekolah', nama: 'SD Negeri 018', dusun: 3, titik: [102.6886, 0.2712], keterangan: 'Sekolah dasar, 6 rombongan belajar' },
  { jenis: 'sekolah', nama: 'SMP Negeri Satu Atap', dusun: 2, titik: [102.7121, 0.2862], keterangan: 'Sekolah menengah pertama' },
  { jenis: 'masjid', nama: 'Masjid Al-Ikhlas', dusun: 1, titik: [102.6931, 0.2902], keterangan: null },
  { jenis: 'masjid', nama: 'Masjid Nurul Huda', dusun: 2, titik: [102.7075, 0.2911], keterangan: null },
  { jenis: 'masjid', nama: 'Masjid Al-Muttaqin', dusun: 3, titik: [102.6918, 0.2745], keterangan: null },
  { jenis: 'masjid', nama: 'Masjid Baitur Rahman', dusun: 4, titik: [102.7102, 0.2738], keterangan: null },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 1, titik: [102.6881, 0.2918], keterangan: 'Gedung posyandu' },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 2, titik: [102.7046, 0.2867], keterangan: 'Gedung posyandu' },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 3, titik: [102.6858, 0.2768], keterangan: 'Gedung posyandu, direhabilitasi tahun ini' },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 4, titik: [102.7139, 0.2694], keterangan: 'Gedung posyandu' },
  { jenis: 'pustu', nama: 'Puskesmas Pembantu', dusun: 2, titik: [102.7088, 0.284], keterangan: 'Layanan kesehatan dasar, bidan desa' },
]

/** Geometri desa demo (SPEC §8). Tetap, tanpa PRNG, supaya lokasi kegiatan bisa ditempatkan di dalam dusunnya. */
export function bangkitkanPeta(o: { desa: Desa; dusun: readonly Dusun[] }): PetaDesa {
  const dusunDesa = o.dusun.filter((d) => d.desaId === o.desa.id)
  const kode = o.desa.kodeSurat.toLowerCase()
  const cari = (nomor: number): Dusun => {
    const d = dusunDesa.find((x) => x.nomor === nomor)
    if (!d) throw new Error(`Dusun ${nomor} tidak ada`)
    return d
  }
  const fasilitas = FASILITAS.map((f, i): Fasilitas => {
    const d = cari(f.dusun)
    return {
      id: `fas_${kode}_${String(i + 1).padStart(2, '0')}`, desaId: o.desa.id, jenis: f.jenis,
      nama: typeof f.nama === 'string' ? f.nama : f.nama(d), dusunId: d.id, titik: f.titik, keterangan: f.keterangan,
    }
  })
  return {
    desaId: o.desa.id,
    pusat: PUSAT_PETA,
    zoom: ZOOM,
    dusun: dusunDesa.map((d) => ({ dusunId: d.id, batas: BATAS[d.nomor] ?? [] })),
    fasilitas,
  }
}
