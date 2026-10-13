import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { PosApbdes } from '@/domain/keuangan/schema'
import { statusKegiatan, type Dokumentasi, type Kegiatan, type SumberDana } from '@/domain/pembangunan/schema'
import type { Titik } from '@/domain/peta/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

const HARI_MS = 86_400_000

type Rencana = {
  nama: string
  volume: string | null
  lokasi: string
  dusun: number
  anggaran: number
  sumber: SumberDana
  fisik: number
  /** Realisasi keuangan terhadap anggaran. */
  keuangan: number
  /** Hari sebelum (negatif) atau sesudah tanggal acuan; mulai null berarti belum dimulai. */
  mulai: number | null
  target: number
  /** Hari dokumentasi 50% dan 100%, bila progresnya sudah sampai. */
  dok50: number | null
  dok100: number | null
  titik: Titik
  /** Foto kurasi dokumentasi per persen progres (nama berkas di /demo/foto/), bila ada. */
  foto?: Partial<Record<Dokumentasi['persen'], string>>
}

/** SPEC §12.6: Pembangunan 2026, total Rp721.900.000 di dalam bidang Pelaksanaan Pembangunan. */
const RENCANA: readonly Rencana[] = [
  {
    nama: 'Semenisasi jalan lingkungan Dusun III', volume: '450 m', lokasi: 'Jalan lingkungan RT 011–013', dusun: 3, anggaran: 245_000_000,
    sumber: 'DD', fisik: 70, keuangan: 0.62, mulai: -100, target: 45, dok50: -40, dok100: null, titik: [102.7505, 0.233],
    foto: { 0: 'semenisasi-0', 50: 'semenisasi-50' },
  },
  {
    nama: 'Drainase RT 006–007', volume: '320 m', lokasi: 'RT 006 dan RT 007', dusun: 2, anggaran: 98_000_000,
    sumber: 'DD', fisik: 100, keuangan: 0.99, mulai: -190, target: -95, dok50: -150, dok100: -100, titik: [102.7662, 0.257],
  },
  {
    nama: 'Rehabilitasi Posyandu Kenanga', volume: '1 unit', lokasi: 'Gedung Posyandu Kenanga', dusun: 3, anggaran: 58_500_000,
    sumber: 'ADD', fisik: 100, keuangan: 0.98, mulai: -160, target: -70, dok50: -120, dok100: -75, titik: [102.7459, 0.241],
  },
  {
    nama: 'Sumur bor air bersih Dusun IV', volume: '2 unit', lokasi: 'RT 016 dan RT 018', dusun: 4, anggaran: 64_000_000,
    sumber: 'DD', fisik: 40, keuangan: 0.35, mulai: -60, target: 60, dok50: null, dok100: null, titik: [102.7758, 0.2308],
  },
  {
    nama: 'Titian kayu penghubung Dusun II–IV', volume: '180 m', lokasi: 'Antara Dusun II dan Dusun IV', dusun: 4, anggaran: 96_400_000,
    sumber: 'Bantuan Provinsi', fisik: 15, keuangan: 0.1, mulai: -25, target: 90, dok50: null, dok100: null, titik: [102.775, 0.2425],
  },
  {
    nama: 'Lampu jalan tenaga surya', volume: '24 titik', lokasi: 'Dusun I dan Dusun II', dusun: 1, anggaran: 72_000_000,
    sumber: 'DD', fisik: 100, keuangan: 1, mulai: -210, target: -130, dok50: -175, dok100: -135, titik: [102.7552, 0.25],
  },
  {
    nama: 'Pelantar perahu nelayan', volume: '1 unit', lokasi: 'Tepi Sungai Kampar, Dusun I', dusun: 1, anggaran: 88_000_000,
    sumber: 'DD', fisik: 0, keuangan: 0, mulai: null, target: 120, dok50: null, dok100: null, titik: [102.749, 0.2605],
  },
]

/** Pos APBDes 5.2.08: operasional TPK dan kegiatan pembangunan kecil, melengkapi bidang 5.2 sampai Rp748.900.000. */
const OPERASIONAL = { nama: 'Operasional TPK dan kegiatan pembangunan lainnya', anggaran: 27_000_000, keuangan: 0.6 }

const KETERANGAN: Readonly<Record<Dokumentasi['persen'], string>> = {
  0: 'Kondisi lokasi sebelum dikerjakan',
  50: 'Pekerjaan berjalan setengah',
  100: 'Pekerjaan selesai dan diserahterimakan',
}

const sampaiRibuan = (n: number) => Math.round(n / 1000) * 1000

/**
 * 7 kegiatan pembangunan (SPEC §12.6) dan rincian APBDes bidang 5.2. Tanggal dihitung relatif terhadap tanggal acuan,
 * jadi kegiatan yang selesai selalu sudah lewat dan yang berjalan belum mencapai targetnya.
 */
export function bangkitkanPembangunan(o: { desa: Desa; dusun: readonly Dusun[]; acuan: Date }): { kegiatan: Kegiatan[]; rincian: PosApbdes[] } {
  const kode = o.desa.kodeSurat.toLowerCase()
  const geser = (hari: number) => tanggalIsoWib(new Date(o.acuan.getTime() + hari * HARI_MS))
  const dusunId = (nomor: number) => {
    const d = o.dusun.find((x) => x.desaId === o.desa.id && x.nomor === nomor)
    if (!d) throw new Error(`Dusun ${nomor} tidak ada`)
    return d.id
  }
  const kegiatan = RENCANA.map((r, i): Kegiatan => {
    const nomor = String(i + 1).padStart(2, '0')
    const mulai = r.mulai === null ? null : geser(r.mulai)
    const foto = (persen: Dokumentasi['persen']) => {
      const berkas = r.foto?.[persen]
      return berkas ? `/demo/foto/${berkas}.jpg` : null
    }
    const dokumentasi: Dokumentasi[] = [
      { persen: 0, tanggal: geser(r.mulai ?? -10), keterangan: KETERANGAN[0], foto: foto(0) },
      ...(r.dok50 === null ? [] : [{ persen: 50 as const, tanggal: geser(r.dok50), keterangan: KETERANGAN[50], foto: foto(50) }]),
      ...(r.dok100 === null ? [] : [{ persen: 100 as const, tanggal: geser(r.dok100), keterangan: KETERANGAN[100], foto: foto(100) }]),
    ]
    return {
      id: `kgt_${kode}_${nomor}`, desaId: o.desa.id, kodeApbdes: `5.2.${nomor}`, nama: r.nama, volume: r.volume, lokasi: r.lokasi,
      dusunId: dusunId(r.dusun), sumberDana: r.sumber, pelaksana: `TPK Desa ${o.desa.nama}`, mulai, targetSelesai: geser(r.target),
      progresFisik: r.fisik, status: statusKegiatan(r.fisik, mulai), titik: r.titik, dokumentasi,
    }
  })
  const rincian: PosApbdes[] = [
    ...RENCANA.map((r, i) => ({
      kode: `5.2.${String(i + 1).padStart(2, '0')}`, induk: '5.2', kelompok: 'belanja' as const, nama: r.nama, anggaran: r.anggaran,
      realisasi: sampaiRibuan(r.anggaran * r.keuangan),
    })),
    {
      kode: '5.2.08', induk: '5.2', kelompok: 'belanja', nama: OPERASIONAL.nama, anggaran: OPERASIONAL.anggaran,
      realisasi: sampaiRibuan(OPERASIONAL.anggaran * OPERASIONAL.keuangan),
    },
  ]
  return { kegiatan, rincian }
}
