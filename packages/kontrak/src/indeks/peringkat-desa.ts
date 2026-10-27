import { z } from 'zod'
import { formatAngka } from '../format/angka'
import { formatTanggal } from '../format/tanggal'
import { KATEGORI_DESA, type KategoriDesa, type KategoriSkor } from './kategori'
import { kategoriDesaSchema, musimSchema, tingkatanSchema } from './schema'

/** Parameter URL halaman Peringkat desa; isi sahnya diperiksa handler, bukan skema ini. */
export const filterPeringkatSchema = z.object({ musim: musimSchema.optional(), periode: z.string().optional() })
export type FilterPeringkat = z.infer<typeof filterPeringkatSchema>

/** Posisi desa di satu wilayah (kecamatan atau kabupaten); null bila belum memenuhi syarat kategori itu. */
export const posisiSchema = z
  .strictObject({
    peringkat: z.number().int().min(1),
    bersama: z.boolean(),
    dari: z.number().int().min(1),
    /** Nilai ukuran desa berperingkat 3 di wilayah itu; nama desanya tidak dikirim. Null bila kurang dari 3 desa memenuhi syarat. */
    ambangJuara3: z.number().nullable(),
  })
  .nullable()
export type Posisi = z.infer<typeof posisiSchema>

export const barisKategoriDesaSchema = z.strictObject({
  kategori: kategoriDesaSchema,
  ukuran: z.number().nullable(),
  skor: z.number().nullable(),
  alasan: z.string().nullable(),
  kecamatan: posisiSchema,
  kabupaten: posisiSchema,
})
export type BarisKategoriDesa = z.infer<typeof barisKategoriDesaSchema>

/** Enam periode terakhir sampai periode yang dipilih, terlama dulu. */
export const trenSchema = z.array(z.strictObject({ periode: z.strictObject({ kode: z.string(), label: z.string() }), indeks: z.number().nullable() }))
export type Tren = z.infer<typeof trenSchema>

export const satuSaranSchema = z.strictObject({ kategori: kategoriDesaSchema, kalimat: z.string(), href: z.string() })
export const saranSchema = z.array(satuSaranSchema).max(5)
export type Saran = z.infer<typeof saranSchema>

const periodeIsi = z.strictObject({ kode: z.string(), label: z.string(), berjalan: z.boolean(), tutupPada: z.string() })

/** GET /peringkat: halaman Peringkat panel desa. Hanya data desa sesi (SPEC-V0.2 §9.5). */
export const peringkatDesaSchema = z.discriminatedUnion('peserta', [
  z.strictObject({ peserta: z.literal(false), desa: z.strictObject({ nama: z.string() }), alasan: z.string() }),
  z.strictObject({
    peserta: z.literal(true),
    desa: z.strictObject({ nama: z.string(), kecamatan: z.string(), kabupaten: z.string() }),
    musim: musimSchema,
    periode: periodeIsi,
    daftarPeriode: z.array(z.strictObject({ kode: z.string(), label: z.string(), berjalan: z.boolean() })),
    indeks: z.number().nullable(),
    tingkatan: tingkatanSchema.nullable(),
    kategori: z.array(barisKategoriDesaSchema),
    tren: trenSchema,
    saran: saranSchema,
  }),
])
export type PeringkatDesa = z.infer<typeof peringkatDesaSchema>

/** Kartu di Beranda panel desa (rencana 7C-2 butir 10). */
export const kartuPeringkatSchema = z.strictObject({
  periode: z.strictObject({ kode: z.string(), label: z.string() }),
  indeks: z.number().nullable(),
  tingkatan: tingkatanSchema.nullable(),
  umumKabupaten: posisiSchema,
  alasanUmum: z.string().nullable(),
  kabupaten: z.string(),
  saran: satuSaranSchema.nullable(),
})
export type KartuPeringkat = z.infer<typeof kartuPeringkatSchema>

export function alasanBukanPeserta(namaDesa: string): string {
  return `Desa ${namaDesa} belum ikut peringkat. Peringkat diikuti desa berstatus Aktif sepanjang periode.`
}

/** Angka mentah dari data desa saat ini untuk menyusun saran naik. */
export type HitunganSaran = {
  suratTtdLama: number
  suratMenungguLama: number
  pengaduanBaru: number
  pendudukBelumLengkap: number
  /** Waktu sinkron APBDes tahun ini; null bila desa belum punya APBDes tahun ini. */
  apbdesSinkron: string | null
  kegiatanTanpaKabar: number
  suratMasukBulanIni: number
  /** Persen surat bulan ini yang diajukan lewat layanan mandiri (0-100). */
  persenOnline: number
  adaKabarMingguIni: boolean
  /** Serapan klasemen sementara bulan berjalan (persen); null bila tidak punya APBDes. */
  serapan: number | null
}

const SEGAR_SINKRON_HARI = 35
const MIN_SURAT_DIGITAL = 10
const AMBANG_DIGITAL = 25
const AMBANG_SERAPAN = 80
const HARI_MS = 86_400_000

type Kandidat = { kategori: KategoriSkor; kalimat: string; href: string }

/**
 * Saran naik dari data desa saat ini (rencana 7C-2 butir 9): paling banyak 5, mulai dari kategori dengan skor terendah.
 * `skor` adalah skor klasemen sementara bulan berjalan; kategori tanpa skor dianggap 0. `hariIni` "YYYY-MM-DD" WIB.
 */
export function susunSaran(h: HitunganSaran, skor: Partial<Record<KategoriSkor, number | null>>, hariIni: string): Saran {
  const n = formatAngka
  const kandidat: Kandidat[] = []
  const tambah = (ada: boolean, kategori: KategoriSkor, kalimat: () => string, href: string) => {
    if (ada) kandidat.push({ kategori, kalimat: kalimat(), href })
  }
  tambah(h.suratTtdLama > 0, 'layanan', () => `${n(h.suratTtdLama)} surat menunggu tanda tangan lebih dari 2 hari`, '/admin/surat')
  tambah(h.suratMenungguLama > 0, 'layanan', () => `${n(h.suratMenungguLama)} permohonan belum diproses lebih dari 1 hari`, '/admin/surat')
  tambah(h.pengaduanBaru > 0, 'responsif', () => `${n(h.pengaduanBaru)} pengaduan belum dibalas`, '/admin/pengaduan')
  tambah(h.pendudukBelumLengkap > 0, 'data', () => `Data ${n(h.pendudukBelumLengkap)} penduduk belum lengkap`, '/admin/kependudukan/penduduk')
  const hariSinkron = h.apbdesSinkron === null ? 0 : (Date.parse(`${hariIni}T00:00:00+07:00`) - Date.parse(h.apbdesSinkron)) / HARI_MS
  tambah(h.apbdesSinkron !== null && hariSinkron > SEGAR_SINKRON_HARI, 'transparan', () => `Realisasi APBDes terakhir disinkronkan ${formatTanggal(h.apbdesSinkron!)}`, '/admin/keuangan')
  tambah(h.kegiatanTanpaKabar > 0, 'transparan', () => `${n(h.kegiatanTanpaKabar)} kegiatan pembangunan belum punya kabar kemajuan bulan ini`, '/admin/pembangunan')
  tambah(h.suratMasukBulanIni >= MIN_SURAT_DIGITAL && h.persenOnline < AMBANG_DIGITAL, 'digital', () => `Baru ${n(Math.round(h.persenOnline))}% surat bulan ini diajukan warga lewat layanan mandiri`, '/admin/surat')
  tambah(!h.adaKabarMingguIni, 'website', () => 'Belum ada kabar atau pengumuman minggu ini', '/admin/website')
  tambah(h.serapan !== null && h.serapan < AMBANG_SERAPAN, 'serapan', () => `Realisasi belanja ${n(Math.round(h.serapan!))}% dari target berjalan`, '/admin/keuangan')

  const nilai = (k: KategoriSkor): number => skor[k] ?? 0
  const urutKategori = (k: KategoriDesa): number => KATEGORI_DESA.indexOf(k)
  return kandidat
    .map((k, i) => ({ k, i }))
    .sort((a, b) => nilai(a.k.kategori) - nilai(b.k.kategori) || urutKategori(a.k.kategori) - urutKategori(b.k.kategori) || a.i - b.i)
    .slice(0, 5)
    .map(({ k }) => k)
}
