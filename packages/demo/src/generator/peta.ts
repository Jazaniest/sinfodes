import type { Fasilitas, JenisFasilitas, PetaDesa, Titik } from '@sinfodes/kontrak/peta/schema'
import type { Desa, Dusun } from '@sinfodes/kontrak/wilayah/schema'

/**
 * Titik tengah desa fiktif, perkiraan di sekitar Teluk Meranti, Pelalawan. Peta tidak menampilkan nama tempat, jadi
 * desa fiktif ini tidak menimpa nama desa sungguhan (SPEC §8). Pusat sedikit ke utara supaya sungai di batas utara ikut tampil.
 */
export const PUSAT_PETA: Titik = [102.76, 0.2475]
const ZOOM = 12.6

// Simpul bersama batas dusun (petak 2×2: Dusun I dan II di utara berbatas sungai, III dan IV di selatan). Simpul tepi
// utara diletakkan di tepi selatan sungai besar menurut tile OpenFreeMap.
const BL: Titik = [102.74, 0.2621]
const BT: Titik = [102.78, 0.2651]
const TG: Titik = [102.7608, 0.2434]
const UT: Titik = [102.76, 0.2634]
const BR: Titik = [102.74, 0.2443]
const TM: Titik = [102.78, 0.2437]
const SL: Titik = [102.7595, 0.226]
const BD: Titik = [102.74, 0.226]
const TGR: Titik = [102.7805, 0.2255]

/** Batas per nomor dusun. Tepi utara berkelok mengikuti sungai. */
const BATAS: Readonly<Record<number, Titik[]>> = {
  1: [BL, [102.746, 0.2619], [102.753, 0.2622], UT, TG, BR, BL],
  2: [UT, [102.767, 0.2648], [102.774, 0.2655], BT, TM, TG, UT],
  3: [BR, TG, SL, BD, BR],
  4: [TG, TM, TGR, SL, TG],
}

type Butir = { jenis: JenisFasilitas; nama: string | ((d: Dusun) => string); dusun: number; titik: Titik; keterangan: string | null }

const FASILITAS: readonly Butir[] = [
  { jenis: 'kantor-desa', nama: 'Kantor Desa', dusun: 1, titik: [102.7505, 0.2525], keterangan: 'Pusat layanan administrasi desa' },
  { jenis: 'sekolah', nama: 'SD Negeri 012', dusun: 1, titik: [102.7472, 0.2491], keterangan: 'Sekolah dasar, 6 rombongan belajar' },
  { jenis: 'sekolah', nama: 'SD Negeri 018', dusun: 3, titik: [102.7486, 0.2352], keterangan: 'Sekolah dasar, 6 rombongan belajar' },
  { jenis: 'sekolah', nama: 'SMP Negeri Satu Atap', dusun: 2, titik: [102.7721, 0.2502], keterangan: 'Sekolah menengah pertama' },
  { jenis: 'masjid', nama: 'Masjid Al-Ikhlas', dusun: 1, titik: [102.7531, 0.2542], keterangan: null },
  { jenis: 'masjid', nama: 'Masjid Nurul Huda', dusun: 2, titik: [102.7675, 0.2551], keterangan: null },
  { jenis: 'masjid', nama: 'Masjid Al-Muttaqin', dusun: 3, titik: [102.7518, 0.2385], keterangan: null },
  { jenis: 'masjid', nama: 'Masjid Baitur Rahman', dusun: 4, titik: [102.7702, 0.2378], keterangan: null },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 1, titik: [102.7481, 0.2558], keterangan: 'Gedung posyandu' },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 2, titik: [102.7646, 0.2507], keterangan: 'Gedung posyandu' },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 3, titik: [102.7458, 0.2408], keterangan: 'Gedung posyandu, direhabilitasi tahun ini' },
  { jenis: 'posyandu', nama: (d) => `Posyandu ${d.posyandu}`, dusun: 4, titik: [102.7739, 0.2334], keterangan: 'Gedung posyandu' },
  { jenis: 'pustu', nama: 'Puskesmas Pembantu', dusun: 2, titik: [102.7688, 0.248], keterangan: 'Layanan kesehatan dasar, bidan desa' },
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
