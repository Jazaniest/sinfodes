/**
 * Kontrak tema v1 (SPEC-V0.2 §11.1): satu-satunya daftar variabel CSS dan nama bagian yang boleh diandalkan
 * kerangka website, galeri tema (7E-2), editor susunan (7F), dan CSS kustom (7G).
 */
export const VERSI_KONTRAK_TEMA = 'kontrak-tema v1'

export const VARIABEL_KONTRAK = [
  '--desa-warna-utama',
  '--desa-warna-utama-tua',
  '--desa-warna-utama-muda',
  '--desa-warna-aksen',
  '--desa-latar',
  '--desa-lembar',
  '--desa-teks',
  '--desa-teks-2',
  '--desa-garis',
  '--desa-huruf-judul',
  '--desa-huruf-isi',
  '--desa-sudut',
  '--desa-sudut-besar',
  '--desa-jarak',
  '--desa-jarak-kecil',
] as const
export type VariabelKontrak = (typeof VARIABEL_KONTRAK)[number]

/** Nilai atribut `data-bagian`. Blok lain ditambahkan 7F dengan awalan `blok-`. */
export const BAGIAN_KONTRAK = [
  'kepala',
  'menu',
  'isi',
  'kaki',
  'sampul',
  'lencana',
  'blok-kabar',
  'blok-layanan',
  'blok-pengumuman',
  'blok-agenda',
  'blok-angka',
  'blok-apbdes',
  'blok-potensi',
  'cek-keaslian',
] as const
export type BagianKontrak = (typeof BAGIAN_KONTRAK)[number]
