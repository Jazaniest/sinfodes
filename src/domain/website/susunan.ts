import { z } from 'zod'
import { blokSchema, PESAN_TAUTAN, PESAN_TUJUAN_AJAKAN, susunBlok, type Blok } from './blok'
import type { IdTema } from './tema'

/** Nama yang tidak boleh dipakai halaman tambahan karena dipakai halaman sistem atau alamat lain (SPEC-V0.2 11.4). */
export const NAMA_CADANGAN = [
  'profil', 'kabar', 'transparansi', 'statistik', 'potensi', 'layanan', 'verifikasi', 'kredit-foto', 'halaman', 'admin', 'warga',
] as const
export type NamaCadangan = (typeof NAMA_CADANGAN)[number]

/** Kunci halaman sistem: susunannya tetap, hanya bisa disembunyikan dari menu. */
export const KUNCI_HALAMAN_SISTEM = [
  'profil', 'kabar', 'transparansi', 'statistik', 'potensi', 'layanan', 'verifikasi', 'kredit-foto',
] as const
export type KunciHalamanSistem = (typeof KUNCI_HALAMAN_SISTEM)[number]

/** Halaman sistem yang wajib tampil di menu (SPEC-V0.2 11.4). */
export const HALAMAN_WAJIB = ['layanan', 'verifikasi'] as const

export const LABEL_HALAMAN_SISTEM: Readonly<Record<KunciHalamanSistem, string>> = {
  profil: 'Profil',
  kabar: 'Kabar',
  transparansi: 'Transparansi',
  statistik: 'Statistik',
  potensi: 'Potensi',
  layanan: 'Layanan',
  verifikasi: 'Cek surat',
  'kredit-foto': 'Kredit foto',
}

/** `id` halaman tambahan: `hlm_` + 6 karakter atau lebih. */
export const POLA_ID_HALAMAN = /^hlm_[a-z0-9]{6,}$/
export const POLA_NAMA_HALAMAN = /^[a-z0-9-]{2,40}$/

const PESAN_NAMA_HALAMAN = 'Nama halaman 2-40 karakter: huruf kecil, angka, dan tanda hubung.'
const PESAN_NAMA_GANDA = 'Nama halaman sudah dipakai.'
const PESAN_NAMA_SISTEM = 'Nama ini dipakai halaman sistem.'
const PESAN_MAKS_HALAMAN = 'Paling banyak 10 halaman tambahan.'
const PESAN_MAKS_BLOK = 'Paling banyak 30 blok di satu halaman.'
const PESAN_MAKS_TAUTAN = 'Paling banyak 2 tautan luar.'
const PESAN_MENU_WAJIB = 'Layanan dan Cek keaslian wajib ada di menu.'

export const halamanTambahanSchema = z.object({
  id: z.string().regex(POLA_ID_HALAMAN, 'Kode halaman tidak sah.'),
  nama: z.string().regex(POLA_NAMA_HALAMAN, PESAN_NAMA_HALAMAN),
  judul: z.string().trim().min(1, 'Judul halaman wajib diisi.').max(80, 'Paling banyak 80 karakter.'),
  blok: z.array(blokSchema),
})
export type HalamanTambahan = z.infer<typeof halamanTambahanSchema>

export const itemMenuSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('sistem'), kunci: z.enum(KUNCI_HALAMAN_SISTEM), tampil: z.boolean() }),
  z.object({ jenis: z.literal('halaman'), halamanId: z.string().regex(POLA_ID_HALAMAN, 'Kode halaman tidak sah.') }),
  z.object({
    jenis: z.literal('tautan'),
    label: z.string().trim().min(1, 'Label tautan wajib diisi.').max(30, 'Paling banyak 30 karakter.'),
    url: z.string().refine((s) => /^https?:\/\//.test(s.trim()), PESAN_TAUTAN),
  }),
])
export type ItemMenu = z.infer<typeof itemMenuSchema>

/** Susunan website desa (SPEC-V0.2 11.4 & 11.6): beranda, halaman tambahan, dan menu. */
export const susunanSchema = z
  .object({ beranda: z.array(blokSchema), halaman: z.array(halamanTambahanSchema), menu: z.array(itemMenuSchema) })
  .superRefine((s, ctx) => {
    if (s.halaman.length > 10) ctx.addIssue({ code: 'custom', path: ['halaman'], message: PESAN_MAKS_HALAMAN })
    const namaTerpakai = new Set<string>()
    s.halaman.forEach((h, i) => {
      if ((NAMA_CADANGAN as readonly string[]).includes(h.nama)) {
        ctx.addIssue({ code: 'custom', path: ['halaman', i, 'nama'], message: PESAN_NAMA_SISTEM })
        return
      }
      if (namaTerpakai.has(h.nama)) {
        ctx.addIssue({ code: 'custom', path: ['halaman', i, 'nama'], message: PESAN_NAMA_GANDA })
        return
      }
      namaTerpakai.add(h.nama)
    })
    const cekBlok = (daftar: readonly Blok[], path: (string | number)[]) => {
      if (daftar.length > 30) ctx.addIssue({ code: 'custom', path, message: PESAN_MAKS_BLOK })
    }
    cekBlok(s.beranda, ['beranda'])
    s.halaman.forEach((h, i) => cekBlok(h.blok, ['halaman', i, 'blok']))
    if (s.menu.filter((m) => m.jenis === 'tautan').length > 2) {
      ctx.addIssue({ code: 'custom', path: ['menu'], message: PESAN_MAKS_TAUTAN })
    }
    for (const wajib of HALAMAN_WAJIB) {
      const tampil = s.menu.some((m) => m.jenis === 'sistem' && m.kunci === wajib && m.tampil)
      if (!tampil) ctx.addIssue({ code: 'custom', path: ['menu'], message: PESAN_MENU_WAJIB })
    }
    const idHalaman = new Set(s.halaman.map((h) => h.id))
    const tujuanSah = (t: string) => (KUNCI_HALAMAN_SISTEM as readonly string[]).includes(t) || idHalaman.has(t)
    const cekAjakan = (blok: Blok, path: (string | number)[]) => {
      if (blok.jenis === 'ajakan' && !tujuanSah(blok.isi.tujuan)) {
        ctx.addIssue({ code: 'custom', path: [...path, 'isi', 'tujuan'], message: PESAN_TUJUAN_AJAKAN })
      }
    }
    s.beranda.forEach((b, i) => cekAjakan(b, ['beranda', i]))
    s.halaman.forEach((h, hi) => h.blok.forEach((b, bi) => cekAjakan(b, ['halaman', hi, 'blok', bi])))
  })
export type Susunan = z.infer<typeof susunanSchema>

/** Menu bawaan website desa: sama dengan menu v0.1 (tanpa Beranda yang selalu pertama). */
export function menuBawaan(): ItemMenu[] {
  const urutan: readonly KunciHalamanSistem[] = ['profil', 'kabar', 'transparansi', 'statistik', 'potensi', 'layanan', 'verifikasi']
  return urutan.map((kunci): ItemMenu => ({ jenis: 'sistem', kunci, tampil: true }))
}

const b = (id: string, jenis: Parameters<typeof susunBlok>[0]['jenis'], varian?: string, lebar?: 'penuh' | 'lebar' | 'sempit', isi?: Record<string, unknown>): Blok =>
  susunBlok({ id, jenis, varian, lebar, isi })

/**
 * Susunan beranda saran setiap tema galeri (SPEC-V0.2 11.3-11.4). Warta mereproduksi Beranda v0.1; tujuh tema lain
 * berbeda urutan dan variannya. Tabel ini disimpan tanpa aset gambar supaya bisa diimpor pembangkit data tiruan.
 */
export const SUSUNAN_BERANDA_TEMA: Readonly<Record<IdTema, Blok[]>> = {
  // 1 lencana deret; 2 kabar sorotan; 3 layanan kisi; 4 kabar daftar + 5 pengumuman-agenda berdampingan; 6 angka;
  // 7 apbdes; 8 potensi. Sama dengan susunan Beranda v0.1.
  warta: [
    b('blk_warta01', 'lencana', 'deret'),
    b('blk_warta02', 'kabar', 'sorotan', 'penuh', { jumlah: 1 }),
    b('blk_warta03', 'layanan', 'kisi'),
    b('blk_warta04', 'kabar', 'daftar', 'lebar', { jumlah: 5 }),
    b('blk_warta05', 'pengumuman-agenda', 'bertumpuk', 'sempit'),
    b('blk_warta06', 'angka', 'kalimat'),
    b('blk_warta07', 'apbdes', 'batang'),
    b('blk_warta08', 'potensi', 'kartu', 'penuh', { jumlah: 6 }),
  ],
  balai: [
    b('blk_balai01', 'sampul', 'tanpa-foto'),
    b('blk_balai02', 'layanan', 'kisi'),
    b('blk_balai03', 'kabar', 'kartu', 'penuh', { jumlah: 3 }),
    b('blk_balai04', 'pengumuman-agenda', 'berdampingan'),
    b('blk_balai05', 'angka', 'besar'),
    b('blk_balai06', 'apbdes', 'tabel'),
    b('blk_balai07', 'potensi', 'daftar'),
    b('blk_balai08', 'kontak', 'kolom'),
  ],
  pesisir: [
    b('blk_pesisir01', 'sampul', 'foto-besar'),
    b('blk_pesisir02', 'layanan', 'daftar'),
    b('blk_pesisir03', 'kabar', 'kartu', 'penuh', { jumlah: 4 }),
    b('blk_pesisir04', 'galeri', 'geser', 'penuh', { jumlah: 8 }),
    b('blk_pesisir05', 'potensi', 'kartu'),
    b('blk_pesisir06', 'angka', 'kalimat'),
    b('blk_pesisir07', 'pengumuman-agenda', 'berdampingan'),
    b('blk_pesisir08', 'kontak', 'ringkas'),
  ],
  serambi: [
    b('blk_serambi01', 'kabar', 'daftar', 'lebar', { jumlah: 5 }),
    b('blk_serambi02', 'pengumuman-agenda', 'bertumpuk', 'sempit'),
    b('blk_serambi03', 'layanan', 'kisi'),
    b('blk_serambi04', 'angka', 'kalimat'),
    b('blk_serambi05', 'potensi', 'daftar', 'penuh', { jumlah: 5 }),
    b('blk_serambi06', 'galeri', 'kisi'),
    b('blk_serambi07', 'apbdes', 'batang'),
    b('blk_serambi08', 'kontak', 'ringkas'),
  ],
  ladang: [
    b('blk_ladang01', 'kabar', 'kartu', 'penuh', { jumlah: 3 }),
    b('blk_ladang02', 'kabar', 'daftar', 'lebar', { jumlah: 6 }),
    b('blk_ladang03', 'pengumuman-agenda', 'bertumpuk', 'sempit'),
    b('blk_ladang04', 'layanan', 'daftar'),
    b('blk_ladang05', 'angka', 'besar'),
    b('blk_ladang06', 'apbdes', 'batang'),
    b('blk_ladang07', 'potensi', 'daftar'),
    b('blk_ladang08', 'peta', 'lebar'),
  ],
  tenun: [
    b('blk_tenun01', 'galeri', 'geser', 'penuh', { jumlah: 8 }),
    b('blk_tenun02', 'kabar', 'kartu', 'penuh', { jumlah: 4 }),
    b('blk_tenun03', 'lencana', 'deret'),
    b('blk_tenun04', 'angka', 'besar'),
    b('blk_tenun05', 'layanan', 'daftar'),
    b('blk_tenun06', 'apbdes', 'tabel'),
    b('blk_tenun07', 'potensi', 'kartu'),
    b('blk_tenun08', 'pemisah', 'motif'),
  ],
  rimba: [
    b('blk_rimba01', 'sampul', 'foto-samping'),
    b('blk_rimba02', 'pengumuman-agenda', 'berdampingan'),
    b('blk_rimba03', 'kabar', 'daftar', 'penuh', { jumlah: 4 }),
    b('blk_rimba04', 'galeri', 'kisi', 'lebar', { jumlah: 6 }),
    b('blk_rimba05', 'potensi', 'daftar', 'sempit', { jumlah: 3 }),
    b('blk_rimba06', 'angka', 'kalimat'),
    b('blk_rimba07', 'kontak', 'kolom'),
    b('blk_rimba08', 'peta', 'dengan-keterangan'),
  ],
  bandar: [
    b('blk_bandar01', 'layanan', 'kisi'),
    b('blk_bandar02', 'kabar', 'sorotan', 'penuh', { jumlah: 1 }),
    b('blk_bandar03', 'peta', 'dengan-keterangan'),
    b('blk_bandar04', 'angka', 'besar'),
    b('blk_bandar05', 'kabar', 'kartu', 'penuh', { jumlah: 4 }),
    b('blk_bandar06', 'apbdes', 'batang'),
    b('blk_bandar07', 'lencana', 'daftar'),
    b('blk_bandar08', 'potensi', 'daftar'),
  ],
}

/** Susunan bawaan desa baru: beranda Warta (seperti v0.1) dan menu bawaan. */
export function susunanBawaan(): Susunan {
  return { beranda: [...SUSUNAN_BERANDA_TEMA.warta], halaman: [], menu: menuBawaan() }
}

/**
 * Pasangan blok untuk renderer: blok `lebar` yang langsung diikuti blok `sempit` digambar berdampingan (2fr/1fr di
 * layar >= 1024 px), selain itu satu per satu.
 */
export function pasanganBerdampingan<T extends Blok>(blok: readonly T[]): (T | [T, T])[] {
  const hasil: (T | [T, T])[] = []
  for (let i = 0; i < blok.length; i++) {
    const kini = blok[i]
    const berikut = blok[i + 1]
    if (kini.lebar === 'lebar' && berikut?.lebar === 'sempit') {
      hasil.push([kini, berikut])
      i++
    } else hasil.push(kini)
  }
  return hasil
}

/**
 * Body `PUT /website/situs/draf` (7F-2). `dasarId` adalah ID draf yang dimuat klien (null bila mulai dari terbit); bila
 * server sudah punya draf dengan ID lain, simpanan ditolak 409 supaya perubahan tab lain tidak tertimpa diam-diam.
 */
export const simpanDrafSchema = z.object({
  dasarId: z.string().min(1).nullable(),
  tema: z.unknown(),
  susunan: susunanSchema,
})
export type MasukanSimpanDraf = z.infer<typeof simpanDrafSchema>

/**
 * Body `POST /website/situs/pratinjau` (7F-2): tema dan susunan yang sedang disunting untuk satu halaman (`'beranda'`
 * atau ID halaman tambahan). Kontras tema tidak diperiksa supaya pratinjau tetap jalan selama warnanya sedang diperbaiki.
 */
export const pratinjauSchema = z.object({
  tema: z.unknown(),
  susunan: susunanSchema,
  halaman: z.string().min(1, 'Halaman wajib dipilih.'),
})
export type MasukanPratinjau = z.infer<typeof pratinjauSchema>
