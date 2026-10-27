import type { Aset, KategoriAset, KondisiAset } from '@/domain/aset/schema'
import type { Desa } from '@/domain/wilayah/schema'

type Butir = readonly [nama: string, kategori: KategoriAset, tahun: number, asal: Aset['asal'], nilai: number, kondisi: KondisiAset, keterangan: string | null]

/** Golongan.bidang per kategori untuk kode aset. */
const GOLONGAN: Readonly<Record<KategoriAset, string>> = { Tanah: '01.01', Bangunan: '03.01', Kendaraan: '02.02', Peralatan: '02.06' }

/** SPEC §12.6: sekitar 40 butir. */
const DAFTAR: readonly Butir[] = [
  ['Tanah kas desa (kebun sawit)', 'Tanah', 2009, 'Hibah', 375_000_000, 'baik', '2,5 ha · Dusun IV'],
  ['Tanah kantor desa', 'Tanah', 2005, 'Hibah', 180_000_000, 'baik', '1.200 m² · Dusun I'],
  ['Kantor desa', 'Bangunan', 2012, 'Bantuan pemerintah', 850_000_000, 'baik', 'Permanen, 2 lantai'],
  ['Balai desa', 'Bangunan', 2016, 'Pembelian', 420_000_000, 'baik', null],
  ['Gedung Posyandu Melati', 'Bangunan', 2018, 'Pembelian', 95_000_000, 'baik', null],
  ['Gedung Posyandu Mawar', 'Bangunan', 2019, 'Pembelian', 98_000_000, 'baik', null],
  ['Gedung Posyandu Kenanga', 'Bangunan', 2014, 'Pembelian', 72_000_000, 'baik', 'Direhabilitasi tahun ini'],
  ['Gedung Posyandu Anggrek', 'Bangunan', 2020, 'Pembelian', 105_000_000, 'rusak-ringan', 'Atap bocor'],
  ['Ambulans desa', 'Kendaraan', 2021, 'Bantuan pemerintah', 385_000_000, 'baik', null],
  ['Sepeda motor dinas', 'Kendaraan', 2019, 'Pembelian', 21_500_000, 'rusak-ringan', null],
  ['Sepeda motor dinas', 'Kendaraan', 2022, 'Pembelian', 24_800_000, 'baik', null],
  ['Perahu dinas bermesin', 'Kendaraan', 2020, 'Pembelian', 65_000_000, 'rusak-ringan', 'Mesin 15 PK'],
  ['Genset 10 kVA', 'Peralatan', 2018, 'Pembelian', 38_000_000, 'rusak-ringan', null],
  ['Laptop', 'Peralatan', 2019, 'Pembelian', 8_900_000, 'rusak-berat', null],
  ['Laptop', 'Peralatan', 2022, 'Pembelian', 9_500_000, 'baik', null],
  ['Laptop', 'Peralatan', 2022, 'Pembelian', 9_500_000, 'baik', null],
  ['Laptop', 'Peralatan', 2024, 'Pembelian', 10_200_000, 'baik', null],
  ['Printer', 'Peralatan', 2021, 'Pembelian', 3_200_000, 'baik', null],
  ['Printer', 'Peralatan', 2021, 'Pembelian', 3_200_000, 'rusak-ringan', null],
  ['Printer', 'Peralatan', 2024, 'Pembelian', 3_650_000, 'baik', null],
  ['Proyektor', 'Peralatan', 2020, 'Pembelian', 7_800_000, 'baik', null],
  ['Tenda pleton', 'Peralatan', 2019, 'Pembelian', 18_000_000, 'baik', '1 set'],
  ['Kursi lipat', 'Peralatan', 2017, 'Pembelian', 30_000_000, 'baik', '200 unit'],
  ['Meja rapat', 'Peralatan', 2016, 'Pembelian', 12_500_000, 'baik', '6 unit'],
  ['Lemari arsip besi', 'Peralatan', 2015, 'Pembelian', 4_800_000, 'baik', null],
  ['Lemari arsip besi', 'Peralatan', 2015, 'Pembelian', 4_800_000, 'rusak-ringan', null],
  ['Lemari arsip besi', 'Peralatan', 2023, 'Pembelian', 5_600_000, 'baik', null],
  ['Pengeras suara portabel', 'Peralatan', 2020, 'Pembelian', 6_500_000, 'baik', null],
  ['AC split 1 PK', 'Peralatan', 2021, 'Pembelian', 4_300_000, 'baik', 'Ruang pelayanan'],
  ['AC split 1 PK', 'Peralatan', 2021, 'Pembelian', 4_300_000, 'baik', 'Ruang kepala desa'],
  ['Brankas', 'Peralatan', 2012, 'Bantuan pemerintah', 7_500_000, 'baik', null],
  ['Kamera digital', 'Peralatan', 2018, 'Pembelian', 6_200_000, 'rusak-berat', null],
  ['Mesin pemotong rumput', 'Peralatan', 2022, 'Pembelian', 3_900_000, 'baik', null],
  ['Pompa air pemadam portabel', 'Peralatan', 2023, 'Bantuan pemerintah', 28_000_000, 'baik', null],
  ['Timbangan bayi digital', 'Peralatan', 2022, 'Pembelian', 1_450_000, 'baik', 'Posyandu Melati'],
  ['Timbangan bayi digital', 'Peralatan', 2022, 'Pembelian', 1_450_000, 'baik', 'Posyandu Mawar'],
  ['Timbangan bayi digital', 'Peralatan', 2022, 'Pembelian', 1_450_000, 'baik', 'Posyandu Kenanga'],
  ['Timbangan bayi digital', 'Peralatan', 2022, 'Pembelian', 1_450_000, 'baik', 'Posyandu Anggrek'],
  ['Komputer meja', 'Peralatan', 2019, 'Pembelian', 7_900_000, 'rusak-ringan', null],
  ['Papan informasi desa', 'Peralatan', 2021, 'Swadaya', 2_500_000, 'baik', null],
]

/** Inventaris aset desa (SPEC §12.6). Tetap, tanpa PRNG. Kode urut per golongan. */
export function bangkitkanAset(o: { desa: Desa }): Aset[] {
  const urut = new Map<KategoriAset, number>()
  return DAFTAR.map(([nama, kategori, tahun, asal, nilai, kondisi, keterangan], i): Aset => {
    const n = (urut.get(kategori) ?? 0) + 1
    urut.set(kategori, n)
    return {
      id: `ast_${o.desa.kodeSurat.toLowerCase()}_${String(i + 1).padStart(3, '0')}`, desaId: o.desa.id,
      kode: `${GOLONGAN[kategori]}.${String(n).padStart(3, '0')}`, nama, kategori, tahunPerolehan: tahun, asal, nilaiPerolehan: nilai,
      kondisi, keterangan,
    }
  })
}
