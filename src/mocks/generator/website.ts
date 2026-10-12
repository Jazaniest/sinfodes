import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { Pengguna, Peran } from '@/domain/pengguna/schema'
import type { Agenda, Artikel, FotoGaleri, KategoriArtikel, Pengumuman, TampilanWebsite } from '@/domain/website/schema'
import type { Desa } from '@/domain/wilayah/schema'

const HARI_MS = 86_400_000

type RencanaArtikel = {
  judul: string
  kategori: KategoriArtikel
  /** Hari sebelum tanggal acuan. */
  hariLalu: number
  jam: string
  penulis: Extract<Peran, 'operator' | 'sekdes'>
  /** Null berarti masih draf. */
  dibaca: number | null
}

/** SPEC §12.6: 12 artikel tersebar dalam 3 bulan terakhir. Dua yang terbaru masih draf. */
const ARTIKEL: readonly RencanaArtikel[] = [
  { judul: 'Musyawarah Desa Penetapan Penerima BLT Dana Desa 2026', kategori: 'Pemerintahan', hariLalu: 86, jam: '10.15', penulis: 'sekdes', dibaca: 1284 },
  { judul: 'Semenisasi Jalan Dusun III Capai 70 Persen', kategori: 'Pembangunan', hariLalu: 9, jam: '14.30', penulis: 'operator', dibaca: 412 },
  { judul: 'Tradisi Menumbai: Panen Madu Sialang Kembali Digelar', kategori: 'Budaya', hariLalu: 63, jam: '09.00', penulis: 'operator', dibaca: 2051 },
  {
    judul: 'Posyandu Kenanga Selesai Direhab, Layanan Balita Kembali Normal', kategori: 'Kesehatan', hariLalu: 72, jam: '11.20',
    penulis: 'operator', dibaca: 538,
  },
  { judul: 'Gotong Royong Bersihkan Parit Jelang Musim Pasang', kategori: 'Kemasyarakatan', hariLalu: 41, jam: '16.05', penulis: 'operator', dibaca: 367 },
  { judul: 'Penyaluran BLT Tahap III Dijadwalkan 30 September', kategori: 'Pemerintahan', hariLalu: 5, jam: '08.45', penulis: 'sekdes', dibaca: 903 },
  { judul: 'Kelas Ibu Balita: Cegah Stunting dari Dapur Sendiri', kategori: 'Kesehatan', hariLalu: 27, jam: '13.10', penulis: 'operator', dibaca: 455 },
  { judul: 'BUMDes Sialang Makmur Mulai Pasarkan Ikan Salai Selais', kategori: 'Ekonomi', hariLalu: 34, jam: '10.40', penulis: 'operator', dibaca: 780 },
  { judul: '24 Lampu Jalan Tenaga Surya Kini Terangi Dusun I dan II', kategori: 'Pembangunan', hariLalu: 50, jam: '15.15', penulis: 'operator', dibaca: 621 },
  { judul: 'Layanan Surat Kini Bisa Diajukan dari HP', kategori: 'Layanan', hariLalu: 16, jam: '09.30', penulis: 'sekdes', dibaca: 1517 },
  { judul: 'Festival Bono Teluk Meranti, Warga Siapkan Homestay', kategori: 'Budaya', hariLalu: 2, jam: '19.20', penulis: 'operator', dibaca: null },
  { judul: 'Hasil Musrenbangdes: 5 Usulan Prioritas untuk 2027', kategori: 'Pemerintahan', hariLalu: 1, jam: '16.40', penulis: 'sekdes', dibaca: null },
]

/** Hari mulai dan sampai relatif terhadap tanggal acuan. */
const PENGUMUMAN: readonly { judul: string; isi: string; mulai: number; sampai: number }[] = [
  {
    judul: 'Penyaluran BLT Dana Desa Tahap III',
    isi: 'Penerima BLT Dana Desa diminta datang ke kantor desa membawa KTP-el dan KK asli sesuai jadwal dusunnya.',
    mulai: -2, sampai: 6,
  },
  {
    judul: 'Pendaftaran Kelas Ibu Balita Gelombang II',
    isi: 'Ibu yang memiliki balita dapat mendaftar ke kader posyandu di dusun masing-masing. Kuota 30 orang.',
    mulai: -5, sampai: 10,
  },
  {
    judul: 'Pemutakhiran Data Keluarga untuk DTSEN',
    isi: 'Warga yang data keluarganya berubah karena pindah, lahir, atau meninggal diminta melapor ke kantor desa atau lewat layanan mandiri.',
    mulai: -20, sampai: 25,
  },
  {
    judul: 'Pelayanan Surat Ditutup Saat Musyawarah Desa',
    isi: 'Pelayanan surat di kantor desa ditutup pukul 08.00–12.00 karena seluruh perangkat mengikuti musyawarah desa.',
    mulai: -30, sampai: -29,
  },
]

const AGENDA: readonly { judul: string; hari: number; mulai: string; selesai: string | null; tempat: string }[] = [
  { judul: 'Gotong Royong Parit RT 006–007', hari: 4, mulai: '07.30', selesai: '10.00', tempat: 'Parit RT 006, Dusun II' },
  // Sejalan dengan artikel "Penyaluran BLT Tahap III Dijadwalkan 30 September" pada tanggal demo 24 September.
  { judul: 'Penyaluran BLT Dana Desa Tahap III', hari: 6, mulai: '09.00', selesai: '12.00', tempat: 'Kantor Desa' },
  { judul: 'Musyawarah Desa Penyusunan RKPDes 2027', hari: 8, mulai: '09.00', selesai: '13.00', tempat: 'Balai Desa' },
  { judul: 'Rapat Pleno BPD', hari: 13, mulai: '14.00', selesai: null, tempat: 'Balai Desa' },
  { judul: 'Pelatihan Pengolahan Ikan Salai BUMDes', hari: 20, mulai: '09.00', selesai: '15.00', tempat: 'Balai Desa' },
]

/** SPEC §9: foto yang akan dikurasi. Berkasnya belum ada, jadi semuanya belum tersedia. */
const GALERI: readonly [berkas: string, judul: string, album: FotoGaleri['album']][] = [
  ['sampul-sungai-kampar', 'Lanskap Sungai Kampar', 'Sampul'],
  ['kantor-desa', 'Kantor Desa Sungai Sialang', 'Pemerintahan'],
  ['musyawarah-balai-desa', 'Musyawarah di balai desa', 'Pemerintahan'],
  ['posyandu', 'Kegiatan posyandu', 'Kegiatan warga'],
  ['gotong-royong', 'Gotong royong membersihkan parit', 'Kegiatan warga'],
  ['penyaluran-bantuan', 'Penyaluran bantuan', 'Kegiatan warga'],
  ['semenisasi-0', 'Semenisasi jalan Dusun III, progres 0%', 'Pembangunan'],
  ['semenisasi-50', 'Semenisasi jalan Dusun III, progres 50%', 'Pembangunan'],
  ['semenisasi-100', 'Semenisasi jalan Dusun III, progres 100%', 'Pembangunan'],
  ['madu-sialang', 'Panen madu sialang', 'Potensi desa'],
  ['kebun-sawit', 'Kebun sawit warga', 'Potensi desa'],
  ['sadap-karet', 'Menyadap karet', 'Potensi desa'],
  ['ikan-salai', 'Ikan salai selais', 'Potensi desa'],
  ['ombak-bono', 'Ombak Bono di Teluk Meranti', 'Potensi desa'],
  ['perahu-sungai', 'Perahu di Sungai Kampar', 'Potensi desa'],
]

const jadiSlug = (teks: string) =>
  teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const nomor2 = (i: number) => String(i + 1).padStart(2, '0')

/** Isi Website Desa demo (SPEC §12.6). Tetap, tanpa PRNG; tanggal relatif terhadap tanggal acuan. */
export function bangkitkanWebsite(o: { desa: Desa; pengguna: readonly Pengguna[]; acuan: Date }): {
  artikel: Artikel[]
  pengumuman: Pengumuman[]
  agenda: Agenda[]
  galeri: FotoGaleri[]
  tampilan: TampilanWebsite
} {
  const kode = o.desa.kodeSurat.toLowerCase()
  const geser = (hari: number) => tanggalIsoWib(new Date(o.acuan.getTime() + hari * HARI_MS))
  const nama = (peran: Peran) => {
    const p = o.pengguna.find((x) => x.desaId === o.desa.id && x.peran === peran)
    if (!p) throw new Error(`Akun demo ${peran} tidak ada`)
    return p.nama
  }
  return {
    artikel: ARTIKEL.map((r, i) => ({
      id: `art_${kode}_${nomor2(i)}`,
      desaId: o.desa.id,
      judul: r.judul,
      slug: jadiSlug(r.judul),
      kategori: r.kategori,
      status: r.dibaca === null ? 'draf' : 'terbit',
      penulis: nama(r.penulis),
      tanggal: `${geser(-r.hariLalu)}T${r.jam.replace('.', ':')}:00+07:00`,
      dibaca: r.dibaca ?? 0,
    })),
    pengumuman: PENGUMUMAN.map((p, i) => ({
      id: `pmn_${kode}_${nomor2(i)}`, desaId: o.desa.id, judul: p.judul, isi: p.isi, mulai: geser(p.mulai), sampai: geser(p.sampai),
    })),
    agenda: AGENDA.map((a, i) => ({
      id: `agd_${kode}_${nomor2(i)}`, desaId: o.desa.id, judul: a.judul, tanggal: geser(a.hari), mulai: a.mulai, selesai: a.selesai, tempat: a.tempat,
    })),
    galeri: GALERI.map(([berkas, judul, album], i) => ({
      id: `fto_${kode}_${nomor2(i)}`, desaId: o.desa.id, judul, album, berkas: `/demo/foto/${berkas}.jpg`, tersedia: false, kredit: null,
    })),
    tampilan: {
      desaId: o.desa.id,
      aksen: 'biru-tinta',
      motif: 'pucuk-rebung',
      sampul: null,
      logo: null,
      diperbarui: `${geser(-30)}T10:00:00+07:00`,
    },
  }
}
