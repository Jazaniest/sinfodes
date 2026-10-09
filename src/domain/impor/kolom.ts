/** Field penduduk yang bisa diisi dari berkas impor (SPEC §6.8), dalam urutan kolom template. */
export const FIELD_IMPOR = [
  'nik', 'nama', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'agama', 'pendidikan', 'pekerjaan', 'statusPerkawinan',
  'hubunganKeluarga', 'nomorKk', 'dusun', 'rw', 'rt', 'golonganDarah', 'namaAyah', 'namaIbu', 'telepon',
] as const
export type FieldImpor = (typeof FIELD_IMPOR)[number]

export const FIELD_IMPOR_WAJIB: readonly FieldImpor[] = [
  'nik', 'nama', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'agama', 'hubunganKeluarga', 'nomorKk', 'dusun', 'rw', 'rt',
]

export const LABEL_FIELD_IMPOR: Readonly<Record<FieldImpor, string>> = {
  nik: 'NIK',
  nama: 'Nama lengkap',
  jenisKelamin: 'Jenis kelamin',
  tempatLahir: 'Tempat lahir',
  tanggalLahir: 'Tanggal lahir',
  agama: 'Agama',
  pendidikan: 'Pendidikan',
  pekerjaan: 'Pekerjaan',
  statusPerkawinan: 'Status perkawinan',
  hubunganKeluarga: 'Hubungan dalam keluarga',
  nomorKk: 'Nomor KK',
  dusun: 'Dusun',
  rw: 'RW',
  rt: 'RT',
  golonganDarah: 'Golongan darah',
  namaAyah: 'Nama ayah',
  namaIbu: 'Nama ibu',
  telepon: 'Nomor telepon',
}

/** Sinonim kepala kolom yang lazim di berkas desa, sudah dinormalkan (lihat normalkanJudul). */
const SINONIM: Readonly<Record<FieldImpor, readonly string[]>> = {
  nik: ['no nik', 'nomor nik', 'nomor induk kependudukan'],
  nama: ['nama'],
  jenisKelamin: ['jk', 'l p', 'kelamin'],
  tempatLahir: ['tmp lahir', 'tempat lhr'],
  tanggalLahir: ['tgl lahir', 'tgl lhr', 'tanggal lhr'],
  agama: [],
  pendidikan: ['pendidikan terakhir', 'pendidikan dalam kk'],
  pekerjaan: ['jenis pekerjaan'],
  statusPerkawinan: ['status kawin', 'perkawinan', 'status nikah'],
  hubunganKeluarga: ['shdk', 'hubungan', 'hubungan keluarga', 'status hubungan dalam keluarga'],
  nomorKk: ['no kk', 'kk', 'nomor kartu keluarga', 'no kartu keluarga'],
  dusun: [],
  rw: [],
  rt: [],
  golonganDarah: ['gol darah', 'goldar'],
  namaAyah: ['ayah'],
  namaIbu: ['ibu', 'nama ibu kandung'],
  telepon: ['telp', 'no hp', 'nomor hp', 'hp', 'no telepon'],
}

/** "Tgl. Lahir" → "tgl lahir": huruf kecil, tanda baca menjadi spasi. */
export function normalkanJudul(judul: string): string {
  return judul.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Field untuk kepala kolom berkas, lewat label dan sinonimnya; null bila tidak dikenali (SPEC §6.8). */
export function cocokkanKolom(judul: string): FieldImpor | null {
  const n = normalkanJudul(judul)
  return FIELD_IMPOR.find((f) => normalkanJudul(LABEL_FIELD_IMPOR[f]) === n || SINONIM[f].includes(n)) ?? null
}

/** Field per kolom berkas, berurutan seperti kolomnya; null = kolom diabaikan. */
export type Pemetaan = readonly (FieldImpor | null)[]

/** Kolom wajib yang belum dipetakan, dan field yang dipakai lebih dari satu kolom. */
export function periksaPemetaan(pemetaan: Pemetaan): { kurang: FieldImpor[]; ganda: FieldImpor[] } {
  const dipakai = pemetaan.filter((f): f is FieldImpor => f !== null)
  return {
    kurang: FIELD_IMPOR_WAJIB.filter((f) => !dipakai.includes(f)),
    ganda: FIELD_IMPOR.filter((f) => dipakai.filter((x) => x === f).length > 1),
  }
}

/** Isi "Unduh template": satu baris kepala kolom. Tanpa baris contoh, supaya contoh tidak ikut terimpor. */
export function barisTemplate(): string[][] {
  return [FIELD_IMPOR.map((f) => LABEL_FIELD_IMPOR[f])]
}
