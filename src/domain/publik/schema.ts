import { z } from 'zod'
import { jenisSuratWargaSchema } from '../warga/ajukan'
import {
  agendaSchema, ID_AKSEN, KATEGORI_ARTIKEL, KATEGORI_POTENSI, kreditFotoSchema, MOTIF_WEBSITE, pengumumanSchema,
} from '../website/schema'
import { desaSchema } from '../wilayah/schema'

const waktu = z.iso.datetime({ offset: true })
const tanggal = z.iso.date()
const jumlah = z.number().int().min(0)

/** GET /publik/:slug: identitas dan tampilan untuk kepala dan kaki semua halaman website desa (SPEC §9). */
export const identitasPublikSchema = desaSchema
  .pick({
    slug: true, nama: true, kecamatan: true, kabupaten: true, provinsi: true, alamatKantor: true, kodePos: true, surel: true,
    telepon: true, jamLayanan: true, luasKm2: true,
  })
  .extend({
    aksen: z.enum(ID_AKSEN),
    motif: z.enum(MOTIF_WEBSITE),
    /** Logo website, atau lambang desa bila logo belum diunggah; kosong berarti monogram. */
    logo: z.string().nullable(),
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
export const berandaPublikSchema = z.object({
  utama: ringkasArtikelSchema.nullable(),
  terbaru: z.array(ringkasArtikelSchema),
  pengumuman: z.array(pengumumanPublikSchema),
  agenda: z.array(agendaPublikSchema),
  angka: angkaDesaSchema,
  sampul: fotoPublikSchema.nullable(),
  /** Cuplikan APBDes terbaru (SPEC §9: MiniBar pendapatan dan belanja); null bila desa belum mengumumkan APBDes. */
  apbdes: z.object({ tahun: z.number().int(), pendapatan: anggaranRealisasiSchema, belanja: anggaranRealisasiSchema }).nullable(),
  potensi: z.array(ringkasPotensiSchema),
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
