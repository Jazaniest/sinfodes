import { formatAngka } from '@sinfodes/kontrak/format/angka'

/** Potensi umum desa di Riau untuk templat profil singkat desa rekaman (SPEC-V0.2 §13). */
export const POTENSI_UMUM = ['kelapa sawit', 'karet', 'perikanan sungai', 'kelapa', 'sagu', 'madu sialang'] as const

type Masukan = { nama: string; kecamatan: string; kabupaten: string; jiwa: number; potensi: string }

/**
 * Dua paragraf profil singkat desa rekaman: nama dan letak desa, jumlah jiwa dari rekaman, dan satu potensi. Hanya
 * angka gabungan, tanpa nama orang dan tanpa NIK.
 */
export function susunProfilSingkat(m: Masukan): string[] {
  return [
    `Desa ${m.nama} berada di Kecamatan ${m.kecamatan}, Kabupaten ${m.kabupaten}, dengan jumlah penduduk sekitar ${formatAngka(m.jiwa)} jiwa.`,
    `Sebagian besar warga menggantungkan hidup dari ${m.potensi}. Pemerintah desa memakai Sinfodes untuk melayani surat dan menyampaikan kabar kepada warga.`,
  ]
}
