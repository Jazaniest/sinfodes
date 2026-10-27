import { ID_TEMA, PRESET_WARNA, type IdPreset, type IdTema, type TemaDasar } from './tema'

/** Bagian tema yang ikut berganti saat tema dipasang; logo, sampul, dan halaman masuk warga milik desa. */
export type DasarTema = Omit<TemaDasar, 'logo' | 'sampul' | 'warga' | 'idGaleri'>

/** Desa yang dipotret untuk gambar pratinjau galeri (Beranda Sungai Sialang dengan tema galeri menimpa temanya). */
export const SLUG_PRATINJAU_TEMA = 'sungaisialang'

const warna = (id: IdPreset): string => PRESET_WARNA.find((p) => p.id === id)!.hex

/**
 * Pengaturan Dasar delapan tema galeri (SPEC-V0.2 §11.3). Tema berbeda strukturnya (pasangan huruf, bentuk kepala,
 * perlakuan foto, kepadatan), bukan hanya warnanya. Nama, keterangan, dan gambar pratinjaunya ada di `galeri-tema.ts`;
 * berkas ini dipisah supaya backend tiruan hanya membawa pengaturannya.
 */
export const DASAR_TEMA: Readonly<Record<IdTema, DasarTema>> = {
  warta: {
    warnaUtama: warna('biru-tinta'), warnaAksen: warna('biru-tinta'), latar: 'kertas', huruf: 'plex', sudut: 'tajam',
    kepadatan: 'lega', kepala: 'warta', foto: 'bingkai', motif: 'pucuk-rebung',
  },
  balai: {
    warnaUtama: warna('hijau-sawit'), warnaAksen: '#8A6212', latar: 'putih', huruf: 'source', sudut: 'sedikit',
    kepadatan: 'lega', kepala: 'ringkas', foto: 'penuh', motif: 'garis',
  },
  pesisir: {
    warnaUtama: warna('teal-sungai'), warnaAksen: warna('teal-sungai'), latar: 'putih', huruf: 'literata', sudut: 'bulat',
    kepadatan: 'lega', kepala: 'pita', foto: 'penuh', motif: 'sisik-ikan',
  },
  serambi: {
    warnaUtama: warna('merah-bata'), warnaAksen: warna('coklat-tanah'), latar: 'kertas', huruf: 'fraunces', sudut: 'sedikit',
    kepadatan: 'lega', kepala: 'warta', foto: 'bingkai', motif: 'awan-larat',
  },
  ladang: {
    warnaUtama: warna('coklat-tanah'), warnaAksen: warna('hijau-sawit'), latar: 'kertas', huruf: 'bitter', sudut: 'tajam',
    kepadatan: 'rapat', kepala: 'ringkas', foto: 'bingkai', motif: 'tumpal',
  },
  tenun: {
    warnaUtama: warna('ungu-songket'), warnaAksen: warna('merah-bata'), latar: 'putih', huruf: 'archivo', sudut: 'tajam',
    kepadatan: 'rapat', kepala: 'pita', foto: 'penuh', motif: 'siku-keluang',
  },
  rimba: {
    warnaUtama: warna('hijau-lumut'), warnaAksen: warna('hijau-lumut'), latar: 'kertas', huruf: 'source', sudut: 'bulat',
    kepadatan: 'rapat', kepala: 'ringkas', foto: 'penuh', motif: 'itik-pulang-petang',
  },
  bandar: {
    warnaUtama: warna('biru-laut'), warnaAksen: warna('biru-tinta'), latar: 'putih', huruf: 'literata', sudut: 'sedikit',
    kepadatan: 'rapat', kepala: 'pita', foto: 'bingkai', motif: 'mega-mendung',
  },
}

/** Pasang tema galeri: pengaturan tampilan diganti, logo, sampul, dan halaman masuk warga tetap. */
export function pasangTema(tema: TemaDasar, id: IdTema): TemaDasar {
  return { ...tema, ...DASAR_TEMA[id], idGaleri: id }
}

const KUNCI_DASAR = ['warnaUtama', 'warnaAksen', 'latar', 'huruf', 'sudut', 'kepadatan', 'kepala', 'foto', 'motif'] as const

/** Tema galeri yang pengaturannya persis sama dengan tema ini (logo, sampul, dan halaman masuk warga tak dihitung), atau null. */
export function samaDenganGaleri(tema: Omit<TemaDasar, 'idGaleri'> & { idGaleri?: unknown }): IdTema | null {
  return ID_TEMA.find((id) => KUNCI_DASAR.every((k) => DASAR_TEMA[id][k].toUpperCase() === String(tema[k]).toUpperCase())) ?? null
}
