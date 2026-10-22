import { blokBaru, LABEL_JENIS_BLOK, labelVarianBlok, PESAN_TAUTAN, type Blok, type JenisBlok } from '@/domain/website/blok'
import {
  NAMA_CADANGAN, POLA_NAMA_HALAMAN,
  type HalamanTambahan, type KunciHalamanSistem, type Susunan,
} from '@/domain/website/susunan'

/** Batas blok di satu halaman (SPEC-V0.2 11.4); tombol tambah dinonaktifkan di layar bila sudah penuh. */
export const MAKS_BLOK = 30
/** Batas halaman tambahan dan tautan luar (SPEC-V0.2 11.4). */
export const MAKS_HALAMAN = 10
export const MAKS_TAUTAN = 2

/** Nama blok untuk antarmuka dan pembaca layar, mis. "Kabar terbaru (daftar)". */
export function labelBlok(b: Blok): string {
  return `${LABEL_JENIS_BLOK[b.jenis]} (${labelVarianBlok(b).toLocaleLowerCase('id-ID')})`
}

/** Blok satu halaman yang sedang disusun: `beranda` atau ID halaman tambahan. */
export function daftarBlok(susunan: Susunan, halaman: string): Blok[] {
  return halaman === 'beranda' ? susunan.beranda : (susunan.halaman.find((h) => h.id === halaman)?.blok ?? [])
}

function ubahBlok(susunan: Susunan, halaman: string, f: (blok: Blok[]) => Blok[]): Susunan {
  if (halaman === 'beranda') return { ...susunan, beranda: f(susunan.beranda) }
  return { ...susunan, halaman: susunan.halaman.map((h) => (h.id === halaman ? { ...h, blok: f(h.blok) } : h)) }
}

/** `blk_` + 8 karakter acak (keputusan 7F-2). */
export function idBlokBaru(): string {
  const acak = new Uint8Array(8)
  crypto.getRandomValues(acak)
  return `blk_${Array.from(acak, (n) => 'abcdefghijklmnopqrstuvwxyz0123456789'[n % 36]).join('')}`
}

/**
 * Blok baru sesudah `setelahId`, atau di akhir bila tidak ada blok terpilih. Mengembalikan null bila halaman sudah
 * memuat 30 blok.
 */
export function tambahBlok(
  susunan: Susunan,
  halaman: string,
  setelahId: string | null,
  jenis: JenisBlok,
): { susunan: Susunan; id: string } | null {
  const blok = daftarBlok(susunan, halaman)
  if (blok.length >= MAKS_BLOK) return null
  const id = idBlokBaru()
  const posisi = setelahId ? blok.findIndex((b) => b.id === setelahId) : -1
  const indeks = posisi >= 0 ? posisi + 1 : blok.length
  const urutan = [...blok.slice(0, indeks), blokBaru(jenis, id), ...blok.slice(indeks)]
  return { susunan: ubahBlok(susunan, halaman, () => urutan), id }
}

/** Salin blok dengan ID baru, tepat sesudah blok aslinya. */
export function gandakanBlok(susunan: Susunan, halaman: string, blokId: string): Susunan {
  return ubahBlok(susunan, halaman, (blok) => {
    const i = blok.findIndex((b) => b.id === blokId)
    if (i < 0) return [...blok]
    const salinan: Blok = structuredClone({ ...blok[i], id: idBlokBaru() })
    return [...blok.slice(0, i + 1), salinan, ...blok.slice(i + 1)]
  })
}

export function hapusBlok(susunan: Susunan, halaman: string, blokId: string): Susunan {
  return ubahBlok(susunan, halaman, (blok) => blok.filter((b) => b.id !== blokId))
}

/** Ganti satu blok dengan versi barunya (dari panel pengaturan). */
export function gantiBlok(susunan: Susunan, halaman: string, blok: Blok): Susunan {
  return ubahBlok(susunan, halaman, (daftar) => daftar.map((b) => (b.id === blok.id ? blok : b)))
}

/** Pindahkan blok ke indeks tujuan (dipakai tombol Naik/Turun maupun seret-taruh). */
export function pindahBlok(susunan: Susunan, halaman: string, blokId: string, ke: number): Susunan {
  return ubahBlok(susunan, halaman, (blok) => {
    const dari = blok.findIndex((b) => b.id === blokId)
    if (dari < 0) return [...blok]
    const tujuan = Math.max(0, Math.min(blok.length - 1, ke))
    if (dari === tujuan) return [...blok]
    const hasil = [...blok]
    const [pindah] = hasil.splice(dari, 1)
    hasil.splice(tujuan, 0, pindah)
    return hasil
  })
}

export function aturTersembunyi(susunan: Susunan, halaman: string, blokId: string, tersembunyi: boolean): Susunan {
  return ubahBlok(susunan, halaman, (blok) => blok.map((b) => (b.id === blokId ? { ...b, tersembunyi } : b)))
}

/** Blok terpilih sesudah blok `blokId` dihapus: blok sesudahnya, atau sebelumnya bila blok terakhir. */
export function blokTerpilihSesudahHapus(blok: readonly Blok[], blokId: string): string | null {
  const i = blok.findIndex((b) => b.id === blokId)
  if (i < 0) return blok[0]?.id ?? null
  return blok[i + 1]?.id ?? blok[i - 1]?.id ?? null
}

const PESAN_MAKS_HALAMAN = `Paling banyak ${MAKS_HALAMAN} halaman tambahan.`
const PESAN_NAMA_SISTEM = 'Nama ini dipakai halaman sistem.'
const PESAN_NAMA_GANDA = 'Nama halaman sudah dipakai.'
const PESAN_NAMA_HALAMAN = 'Nama halaman 2-40 karakter: huruf kecil, angka, dan tanda hubung.'
const PESAN_JUDUL = 'Judul halaman wajib diisi.'
const PESAN_MAKS_TAUTAN = `Paling banyak ${MAKS_TAUTAN} tautan luar.`
const PESAN_LABEL_TAUTAN = 'Label tautan wajib diisi.'

function idHalamanBaru(): string {
  const acak = new Uint8Array(8)
  crypto.getRandomValues(acak)
  return `hlm_${Array.from(acak, (n) => 'abcdefghijklmnopqrstuvwxyz0123456789'[n % 36]).join('')}`
}

function periksaNama(susunan: Susunan, nama: string, kecualiId?: string): string | null {
  if (!POLA_NAMA_HALAMAN.test(nama)) return PESAN_NAMA_HALAMAN
  if ((NAMA_CADANGAN as readonly string[]).includes(nama)) return PESAN_NAMA_SISTEM
  if (susunan.halaman.some((h) => h.nama === nama && h.id !== kecualiId)) return PESAN_NAMA_GANDA
  return null
}

/**
 * Tambah halaman tambahan: satu blok Teks kosong dan langsung masuk menu di akhir (keputusan 11). `nama` biasanya
 * diusulkan dari judul lewat `slugDesa` dan boleh diubah.
 */
export function tambahHalaman(susunan: Susunan, judul: string, nama: string): { susunan: Susunan; id: string } | { galat: string } {
  if (susunan.halaman.length >= MAKS_HALAMAN) return { galat: PESAN_MAKS_HALAMAN }
  const judulBersih = judul.trim()
  if (judulBersih === '') return { galat: PESAN_JUDUL }
  const galat = periksaNama(susunan, nama)
  if (galat) return { galat }
  const id = idHalamanBaru()
  const baru: HalamanTambahan = { id, nama, judul: judulBersih, blok: [blokBaru('teks', idBlokBaru())] }
  return {
    id,
    susunan: { ...susunan, halaman: [...susunan.halaman, baru], menu: [...susunan.menu, { jenis: 'halaman', halamanId: id }] },
  }
}

/** Ubah judul dan nama halaman tambahan. */
export function ubahHalaman(susunan: Susunan, halamanId: string, judul: string, nama: string): Susunan | { galat: string } {
  const judulBersih = judul.trim()
  if (judulBersih === '') return { galat: PESAN_JUDUL }
  const galat = periksaNama(susunan, nama, halamanId)
  if (galat) return { galat }
  return { ...susunan, halaman: susunan.halaman.map((h) => (h.id === halamanId ? { ...h, judul: judulBersih, nama } : h)) }
}

/**
 * Hapus halaman tambahan beserta item menunya. Ditolak bila halaman masih menjadi tujuan blok Ajakan (keputusan 11).
 */
export function hapusHalaman(susunan: Susunan, halamanId: string): Susunan | { galat: string } {
  const menuduh: string[] = []
  const cek = (blok: readonly Blok[], namaHalaman: string) => {
    if (blok.some((b) => b.jenis === 'ajakan' && b.isi.tujuan === halamanId)) menuduh.push(namaHalaman)
  }
  cek(susunan.beranda, 'Beranda')
  for (const h of susunan.halaman) if (h.id !== halamanId) cek(h.blok, h.judul)
  if (menuduh.length > 0) {
    return { galat: `Halaman ini menjadi tujuan blok Ajakan di ${menuduh.join(', ')}. Ubah atau hapus blok itu dulu.` }
  }
  return {
    ...susunan,
    halaman: susunan.halaman.filter((h) => h.id !== halamanId),
    menu: susunan.menu.filter((m) => !(m.jenis === 'halaman' && m.halamanId === halamanId)),
  }
}

/** Pindahkan item menu ke indeks tujuan. */
export function pindahMenu(susunan: Susunan, dari: number, ke: number): Susunan {
  const menu = [...susunan.menu]
  if (dari < 0 || dari >= menu.length) return susunan
  const tujuan = Math.max(0, Math.min(menu.length - 1, ke))
  const [item] = menu.splice(dari, 1)
  menu.splice(tujuan, 0, item)
  return { ...susunan, menu }
}

/** Tampilkan atau sembunyikan halaman sistem di menu (Layanan dan Cek keaslian wajib tampil). */
export function aturTampilMenu(susunan: Susunan, kunci: KunciHalamanSistem, tampil: boolean): Susunan {
  return {
    ...susunan,
    menu: susunan.menu.map((m) => (m.jenis === 'sistem' && m.kunci === kunci ? { ...m, tampil } : m)),
  }
}

/** Masukkan halaman tambahan ke menu di akhir, atau keluarkan dari menu. */
export function aturMenuHalaman(susunan: Susunan, halamanId: string, diMenu: boolean): Susunan {
  const tanpa = susunan.menu.filter((m) => !(m.jenis === 'halaman' && m.halamanId === halamanId))
  return { ...susunan, menu: diMenu ? [...tanpa, { jenis: 'halaman', halamanId }] : tanpa }
}

/** Tambah tautan luar di akhir menu; ditolak bila sudah dua atau URL-nya bukan http(s). */
export function tambahTautan(susunan: Susunan, label: string, url: string): Susunan | { galat: string } {
  if (susunan.menu.filter((m) => m.jenis === 'tautan').length >= MAKS_TAUTAN) return { galat: PESAN_MAKS_TAUTAN }
  const labelBersih = label.trim()
  if (labelBersih === '') return { galat: PESAN_LABEL_TAUTAN }
  if (labelBersih.length > 30) return { galat: 'Paling banyak 30 karakter.' }
  const urlBersih = url.trim()
  if (!/^https?:\/\//.test(urlBersih)) return { galat: PESAN_TAUTAN }
  return { ...susunan, menu: [...susunan.menu, { jenis: 'tautan', label: labelBersih, url: urlBersih }] }
}

/** Hapus item menu pada urutan itu (dipakai tautan luar). */
export function hapusTautan(susunan: Susunan, indeks: number): Susunan {
  return { ...susunan, menu: susunan.menu.filter((_, i) => i !== indeks) }
}
