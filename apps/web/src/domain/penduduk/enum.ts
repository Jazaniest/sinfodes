export const JENIS_KELAMIN = ['L', 'P'] as const
export type JenisKelamin = (typeof JENIS_KELAMIN)[number]

export const AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu', 'Kepercayaan terhadap Tuhan YME'] as const
export type Agama = (typeof AGAMA)[number]

export const PENDIDIKAN = [
  'Tidak/Belum Sekolah',
  'Belum Tamat SD/Sederajat',
  'Tamat SD/Sederajat',
  'SLTP/Sederajat',
  'SLTA/Sederajat',
  'Diploma I/II',
  'Akademi/Diploma III/Sarjana Muda',
  'Diploma IV/Strata I',
  'Strata II',
  'Strata III',
] as const
export type Pendidikan = (typeof PENDIDIKAN)[number]

export const PEKERJAAN = [
  'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan', 'Pegawai Negeri Sipil',
  'Tentara Nasional Indonesia', 'Kepolisian RI', 'Perdagangan', 'Petani/Pekebun', 'Peternak', 'Nelayan/Perikanan',
  'Industri', 'Konstruksi', 'Transportasi', 'Karyawan Swasta', 'Karyawan BUMN', 'Karyawan Honorer',
  'Buruh Harian Lepas', 'Buruh Tani/Perkebunan', 'Tukang Kayu', 'Tukang Jahit', 'Guru', 'Bidan', 'Perawat',
  'Perangkat Desa', 'Kepala Desa', 'Pedagang', 'Sopir', 'Wiraswasta', 'Lainnya',
] as const
export type Pekerjaan = (typeof PEKERJAAN)[number]

export const STATUS_PERKAWINAN = ['Belum Kawin', 'Kawin Tercatat', 'Kawin Belum Tercatat', 'Cerai Hidup', 'Cerai Mati'] as const
export type StatusPerkawinan = (typeof STATUS_PERKAWINAN)[number]

export const HUBUNGAN_KELUARGA = [
  'Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Cucu', 'Orang Tua', 'Mertua', 'Famili Lain', 'Pembantu', 'Lainnya',
] as const
export type HubunganKeluarga = (typeof HUBUNGAN_KELUARGA)[number]

export const GOLONGAN_DARAH = ['A', 'B', 'AB', 'O', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Tidak Tahu'] as const
export type GolonganDarah = (typeof GOLONGAN_DARAH)[number]

export const KEWARGANEGARAAN = ['WNI', 'WNA'] as const

export const STATUS_DASAR = ['Hidup', 'Meninggal', 'Pindah', 'Hilang'] as const
export type StatusDasar = (typeof STATUS_DASAR)[number]

export const STATUS_PENDUDUK = ['Tetap', 'Sementara'] as const
export type StatusPenduduk = (typeof STATUS_PENDUDUK)[number]

export const KTP_EL = ['Sudah rekam', 'Belum rekam', 'Belum wajib'] as const
export type KtpEl = (typeof KTP_EL)[number]
