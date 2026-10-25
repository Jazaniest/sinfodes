import { z } from 'zod'
import { lencanaPublikSchema } from '../indeks/lencana'
import { lapisanPetaSchema } from '../peta/schema'
import { jenisSuratWargaSchema } from '../warga/ajukan'
import { blokSchema, tinggiBlokHtmlSchema, type Blok, type JenisBlok } from '../website/blok'
import { ID_MOTIF } from '../website/motif'
import { agendaSchema, KATEGORI_ARTIKEL, KATEGORI_POTENSI, kreditFotoSchema, pengumumanSchema } from '../website/schema'
import { temaDasarSchema } from '../website/tema'
import { desaSchema } from '../wilayah/schema'

const waktu = z.iso.datetime({ offset: true })
const tanggal = z.iso.date()
const jumlah = z.number().int().min(0)

/** Satu baris menu website yang sudah diselesaikan (SPEC-V0.2 11.4): label, tujuan, dan tanda tautan luar. */
export const itemMenuPublikSchema = z.object({ label: z.string(), href: z.string(), luar: z.boolean() })
export type ItemMenuPublik = z.infer<typeof itemMenuPublikSchema>

/** GET /publik/:slug: identitas dan tampilan untuk kepala dan kaki semua halaman website desa (SPEC §9). */
export const identitasPublikSchema = desaSchema
  .pick({
    slug: true, nama: true, kecamatan: true, kabupaten: true, provinsi: true, alamatKantor: true, kodePos: true, surel: true,
    telepon: true, jamLayanan: true, luasKm2: true,
  })
  .extend({
    /** Tema Dasar tanpa tampilan halaman masuk warga (`warga`), yang hanya dibaca alamat desa. */
    tema: temaDasarSchema.omit({ warga: true }),
    /** Lambang desa (data URL) untuk favicon dan logo cadangan; null berarti monogram dari inisial desa. */
    favicon: z.string().nullable(),
    /** Menu website dari susunan terbit, dengan Beranda selalu pertama (7F-1). */
    menu: z.array(itemMenuPublikSchema),
    /**
     * CSS kustom desa yang sudah terkurung lingkup (SPEC-V0.2 11.5, 7G); `null` bila tingkat Lanjut mati atau kosong.
     * Hanya direspons website publik — tidak di Cek keaslian maupun layanan warga.
     */
    cssKustom: z.string().nullable(),
  })
export type IdentitasPublik = z.infer<typeof identitasPublikSchema>

/** Foto di website. `berkas` adalah versi besar; versi kecil foto kurasi diturunkan dengan `jalurFotoKecil`. */
export const fotoPublikSchema = z.object({ berkas: z.string().min(1), keterangan: z.string().min(1), kredit: z.string().nullable() })
export type FotoPublik = z.infer<typeof fotoPublikSchema>

export const ringkasArtikelSchema = z.object({
  slug: z.string(),
  judul: z.string(),
  kategori: z.enum(KATEGORI_ARTIKEL),
  tanggal: waktu,
  ringkasan: z.string(),
  foto: fotoPublikSchema.nullable(),
})
export type RingkasArtikel = z.infer<typeof ringkasArtikelSchema>

/** GET /publik/:slug/kabar/:artikel */
export const artikelPublikSchema = ringkasArtikelSchema.extend({ penulis: z.string(), isi: z.array(z.string()).min(1) })
export type ArtikelPublik = z.infer<typeof artikelPublikSchema>

export const pengumumanPublikSchema = pengumumanSchema.omit({ desaId: true })
export const agendaPublikSchema = agendaSchema.omit({ desaId: true })

export const angkaDesaSchema = z.object({ jiwa: jumlah, kk: jumlah, dusun: jumlah, rt: jumlah, luasKm2: z.number().positive().nullable() })
export type AngkaDesa = z.infer<typeof angkaDesaSchema>

const anggaranRealisasiSchema = z.object({ anggaran: jumlah, realisasi: jumlah })

/** Potensi desa di Beranda (SPEC §9): judul, kategori, dan foto; isinya ada di halaman Potensi. */
export const ringkasPotensiSchema = z.object({
  id: z.string(),
  judul: z.string(),
  kategori: z.enum(KATEGORI_POTENSI),
  foto: fotoPublikSchema.nullable(),
})
export type RingkasPotensi = z.infer<typeof ringkasPotensiSchema>

/** GET /publik/:slug/beranda (SPEC §9). */
/**
 * Sumber data per jenis blok (SPEC-V0.2 11.4): blok bersumber diisi server dari modul terkait; blok lain (`z.undefined()`)
 * hanya memakai `isi` yang tersimpan di susunan.
 */
export const DATA_BLOK = {
  sampul: z.object({ nama: z.string(), sampul: fotoPublikSchema.nullable() }),
  kabar: z.object({ artikel: z.array(ringkasArtikelSchema) }),
  layanan: z.undefined(),
  angka: z.object({ nama: z.string(), angka: angkaDesaSchema, sampul: fotoPublikSchema.nullable() }),
  apbdes: z.object({ tahun: z.number().int(), pendapatan: anggaranRealisasiSchema, belanja: anggaranRealisasiSchema }),
  'pengumuman-agenda': z.object({ pengumuman: z.array(pengumumanPublikSchema), agenda: z.array(agendaPublikSchema) }),
  galeri: z.object({ foto: z.array(fotoPublikSchema) }),
  peta: z.object({ lapisan: lapisanPetaSchema }),
  potensi: z.object({ potensi: z.array(ringkasPotensiSchema) }),
  video: z.undefined(),
  sambutan: z.undefined(),
  teks: z.undefined(),
  ajakan: z.object({ href: z.string() }),
  kontak: identitasPublikSchema.pick({ nama: true, alamatKantor: true, telepon: true, surel: true, jamLayanan: true }),
  lencana: z.object({ lencana: z.array(lencanaPublikSchema) }),
  pemisah: z.object({ motif: z.enum(ID_MOTIF) }),
  html: z.object({ nama: z.string(), kode: z.string(), tinggi: tinggiBlokHtmlSchema }),
} as const satisfies Record<JenisBlok, z.ZodType>

type DataBlok<J extends JenisBlok> = z.infer<(typeof DATA_BLOK)[J]>

/** Blok siap tampil (SPEC-V0.2 11.4): isi blok susunan ditambah `data` terisi server; `data` hanya untuk blok bersumber. */
export type BlokTampil = {
  [J in JenisBlok]: Extract<Blok, { jenis: J }> &
    ([DataBlok<J>] extends [undefined] ? { data?: undefined } : { data: DataBlok<J> })
}[JenisBlok]

/** Blok dari API publik. Bagian `isi` divalidasi `blokSchema` dan `data` divalidasi per jenis di `DATA_BLOK`. */
export const blokTampilSchema = z.custom<BlokTampil>((v) => {
  const blok = blokSchema.safeParse(v)
  return blok.success && DATA_BLOK[blok.data.jenis].safeParse((v as { data?: unknown }).data).success
}, 'Blok tidak valid.')

/**
 * Blok pratinjau penyunting (SPEC-V0.2 11.4, 7F-2): blok siap tampil bertanda `kosong: false`, atau blok bersumber yang
 * datanya belum ada bertanda `kosong: true` (tidak tampil di website, digambar kotak bergaris putus di pratinjau). Blok
 * tersembunyi ikut dengan `tersembunyi: true`.
 */
export type BlokPratinjau = (BlokTampil & { kosong: false }) | (Blok & { kosong: true; data?: undefined })

export const blokPratinjauSchema = z.custom<BlokPratinjau>((v) => {
  const tanda = (v as { kosong?: unknown } | null)?.kosong
  if (typeof tanda !== 'boolean') return false
  return tanda ? blokSchema.safeParse(v).success : blokTampilSchema.safeParse(v).success
}, 'Blok pratinjau tidak valid.')

/** `POST /website/situs/pratinjau` (7F-2): blok halaman yang sedang disunting, lengkap dengan tandanya. */
export const pratinjauSitusSchema = z.object({ blok: z.array(blokPratinjauSchema) })
export type PratinjauSitus = z.infer<typeof pratinjauSitusSchema>

/** Halaman tambahan website desa (SPEC-V0.2 11.4): judul dan blok susunannya. */
export const halamanPublikSchema = z.object({ judul: z.string(), blok: z.array(blokTampilSchema) })
export type HalamanPublik = z.infer<typeof halamanPublikSchema>

export const berandaPublikSchema = z.object({
  /** Blok susunan beranda yang sudah berisi data (7F-1). Blok kosong tidak dikirim. */
  blok: z.array(blokTampilSchema),
  /** Profil singkat dua paragraf untuk desa rekaman tanpa kabar maupun pengumuman (SPEC-V0.2 13); null untuk desa lain. */
  profilSingkat: z.array(z.string()).nullable(),
})
export type BerandaPublik = z.infer<typeof berandaPublikSchema>

/** GET /publik/:slug/layanan (SPEC §9). */
export const layananPublikSchema = z.object({
  jenisSurat: z.array(jenisSuratWargaSchema.pick({ id: true, kode: true, nama: true, syarat: true, perkiraanHariKerja: true })),
  posyandu: z.array(z.object({ nama: z.string(), dusun: z.string(), tempat: z.string(), jadwal: tanggal, aturan: z.string() })),
})
export type LayananPublik = z.infer<typeof layananPublikSchema>

/** GET /publik/:slug/kredit-foto (SPEC §9: halaman Kredit foto). */
export const kreditFotoPublikSchema = kreditFotoSchema.extend({ berkas: z.string(), keterangan: z.string() })
export type KreditFotoPublik = z.infer<typeof kreditFotoPublikSchema>

/** POST /publik/:slug/verifikasi */
export const verifikasiMasukanSchema = z.object({ kode: z.string().max(40) })

const berlakuSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('berlaku'), sampai: tanggal.nullable() }),
  z.object({ status: z.literal('kedaluwarsa'), sampai: tanggal }),
  z.object({ status: z.literal('dibatalkan'), pada: waktu }),
])
export type Berlaku = z.infer<typeof berlakuSchema>

/** Hasil verifikasi kode surat (SPEC §7.6): nama disamarkan, tanpa NIK. */
export const hasilVerifikasiSchema = z.object({
  jenis: z.string(),
  nomor: z.string(),
  terbit: waktu,
  nama: z.string(),
  penandatangan: z.object({ jabatan: z.string(), nama: z.string() }),
  berlaku: berlakuSchema,
})
export type HasilVerifikasi = z.infer<typeof hasilVerifikasiSchema>
