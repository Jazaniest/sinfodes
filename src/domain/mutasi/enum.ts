/** SPEC Lampiran C */
export const TEMPAT_DILAHIRKAN = ['RS/RB', 'Puskesmas', 'Polindes', 'Rumah', 'Lainnya'] as const
export type TempatDilahirkan = (typeof TEMPAT_DILAHIRKAN)[number]

export const JENIS_KELAHIRAN = ['Tunggal', 'Kembar 2', 'Kembar 3', 'Kembar 4', 'Lainnya'] as const
export type JenisKelahiran = (typeof JENIS_KELAHIRAN)[number]

export const PENOLONG_KELAHIRAN = ['Dokter', 'Bidan/Perawat', 'Dukun', 'Lainnya'] as const
export type PenolongKelahiran = (typeof PENOLONG_KELAHIRAN)[number]

export const SEBAB_KEMATIAN = [
  'Sakit biasa/tua', 'Wabah penyakit', 'Kecelakaan', 'Kriminalitas', 'Bunuh diri', 'Lainnya',
] as const
export type SebabKematian = (typeof SEBAB_KEMATIAN)[number]

export const YANG_MENERANGKAN_KEMATIAN = ['Dokter', 'Tenaga kesehatan', 'Kepolisian', 'Lainnya'] as const
export type YangMenerangkanKematian = (typeof YANG_MENERANGKAN_KEMATIAN)[number]

export const ALASAN_PINDAH = ['Pekerjaan', 'Pendidikan', 'Keamanan', 'Kesehatan', 'Perumahan', 'Keluarga', 'Lainnya'] as const
export type AlasanPindah = (typeof ALASAN_PINDAH)[number]
