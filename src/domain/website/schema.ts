import { z } from 'zod'

const waktu = z.iso.datetime({ offset: true })
const tanggal = z.iso.date()
const jam = z.string().regex(/^([01]\d|2[0-3])\.[0-5]\d$/)
export const POLA_FOTO_KURASI = /^\/demo\/foto\/[a-z0-9-]+\.jpg$/

/** Kategori kabar desa (SPEC §8, §9). */
export const KATEGORI_ARTIKEL = ['Pemerintahan', 'Pembangunan', 'Kesehatan', 'Kemasyarakatan', 'Ekonomi', 'Budaya', 'Layanan'] as const
export type KategoriArtikel = (typeof KATEGORI_ARTIKEL)[number]

export const STATUS_ARTIKEL = ['draf', 'terbit'] as const
export type StatusArtikel = (typeof STATUS_ARTIKEL)[number]

/** Artikel kabar desa (SPEC §8, §9). Editor artikel belum ada (SPEC §2.2); isinya dari data demo. */
export const artikelSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  judul: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  kategori: z.enum(KATEGORI_ARTIKEL),
  status: z.enum(STATUS_ARTIKEL),
  penulis: z.string().min(1),
  /** Waktu terbit; untuk draf, waktu terakhir disunting. */
  tanggal: waktu,
  dibaca: z.number().int().min(0),
  /** Satu-dua kalimat untuk daftar kabar dan berita utama. */
  ringkasan: z.string().min(1),
  /** Isi artikel per paragraf. */
  isi: z.array(z.string().min(1)).min(1),
  /** Foto kurasi dari galeri, atau null bila kabar ini tanpa foto. */
  foto: z.string().regex(POLA_FOTO_KURASI).nullable(),
})
export type Artikel = z.infer<typeof artikelSchema>

export const pengumumanSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  judul: z.string().min(1),
  isi: z.string().min(1),
  mulai: tanggal,
  sampai: tanggal,
})
export type Pengumuman = z.infer<typeof pengumumanSchema>

export const STATUS_PENGUMUMAN = ['akan-datang', 'berlaku', 'berakhir'] as const
export type StatusPengumuman = (typeof STATUS_PENGUMUMAN)[number]
export const LABEL_STATUS_PENGUMUMAN: Readonly<Record<StatusPengumuman, string>> = {
  'akan-datang': 'Akan datang',
  berlaku: 'Berlaku',
  berakhir: 'Berakhir',
}

/** Status pengumuman pada tanggal `hariIni` (YYYY-MM-DD, WIB). */
export function statusPengumuman(p: Pick<Pengumuman, 'mulai' | 'sampai'>, hariIni: string): StatusPengumuman {
  if (hariIni < p.mulai) return 'akan-datang'
  if (hariIni > p.sampai) return 'berakhir'
  return 'berlaku'
}

/** Agenda kegiatan desa. Jam ditulis "HH.mm"; `selesai` kosong berarti "sampai selesai". */
export const agendaSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  judul: z.string().min(1),
  tanggal,
  mulai: jam,
  selesai: jam.nullable(),
  tempat: z.string().min(1),
})
export type Agenda = z.infer<typeof agendaSchema>

/** "09.00-12.00 WIB", atau "14.00 WIB sampai selesai" bila jam selesai kosong. */
export const teksJamAgenda = (a: Pick<Agenda, 'mulai' | 'selesai'>): string =>
  a.selesai ? `${a.mulai}-${a.selesai} WIB` : `${a.mulai} WIB sampai selesai`

export const ALBUM_GALERI = ['Sampul', 'Pemerintahan', 'Kegiatan warga', 'Pembangunan', 'Potensi desa'] as const

/** Kredit foto kurasi (SPEC §9, K8): judul asli di sumbernya, pembuat, dan lisensi. */
export const kreditFotoSchema = z.object({
  judulAsli: z.string().min(1),
  sumber: z.url(),
  pembuat: z.string().min(1),
  lisensi: z.string().min(1),
  tautanLisensi: z.url(),
})
export type KreditFoto = z.infer<typeof kreditFotoSchema>

/**
 * Foto galeri hasil kurasi (SPEC §9, K8). `tersedia` false untuk foto yang berkasnya belum ada (mis. desa baru);
 * layar lalu menampilkan bingkai "Belum ada foto", bukan foto sementara.
 */
export const fotoGaleriSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  judul: z.string().min(1),
  album: z.enum(ALBUM_GALERI),
  berkas: z.string().regex(POLA_FOTO_KURASI),
  tersedia: z.boolean(),
  kredit: kreditFotoSchema.nullable(),
})
export type FotoGaleri = z.infer<typeof fotoGaleriSchema>

/** Profil desa di website (SPEC §9): sejarah, visi dan misi, serta jarak ke ibu kota kecamatan dan kabupaten. */
export const profilDesaSchema = z.object({
  desaId: z.string(),
  /** Foto kurasi di kepala halaman Profil, mis. kantor desa. */
  foto: z.string().regex(POLA_FOTO_KURASI).nullable(),
  sejarah: z.array(z.string().min(1)).min(1),
  visi: z.string().min(1),
  misi: z.array(z.string().min(1)).min(1),
  /** Mis. { ke: 'ibu kota kecamatan', tempat: 'Teluk Meranti', km: 14 }. */
  jarak: z.array(z.object({ ke: z.string().min(1), tempat: z.string().min(1), km: z.number().positive() })),
})
export type ProfilDesa = z.infer<typeof profilDesaSchema>

/** Kategori potensi desa (SPEC §9). */
export const KATEGORI_POTENSI = ['Hasil hutan', 'Perkebunan', 'Perikanan', 'Wisata'] as const
export type KategoriPotensi = (typeof KATEGORI_POTENSI)[number]

/** Potensi desa (SPEC §9, §12.6: 6 potensi), tampil urut `urutan`. */
export const potensiSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  judul: z.string().min(1),
  kategori: z.enum(KATEGORI_POTENSI),
  ringkasan: z.string().min(1),
  isi: z.array(z.string().min(1)).min(1),
  foto: z.string().regex(POLA_FOTO_KURASI).nullable(),
  urutan: z.number().int().min(0),
})
export type Potensi = z.infer<typeof potensiSchema>

/** UMKM warga (SPEC §9, §12.6: 5 UMKM), masing-masing dengan WhatsApp penjual. */
export const umkmSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  nama: z.string().min(1),
  pemilik: z.string().min(1),
  produk: z.string().min(1),
  dusunId: z.string(),
  /** Nomor HP berawalan 08, tanpa spasi; diubah menjadi tautan wa.me di layar. */
  whatsapp: z.string().regex(/^08\d{8,11}$/),
})
export type Umkm = z.infer<typeof umkmSchema>
