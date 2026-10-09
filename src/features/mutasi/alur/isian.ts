import { z } from 'zod'
import { hitungUmur, tanggalIsoWib } from '@/domain/format/tanggal'
import {
  ALASAN_PINDAH, JENIS_KELAHIRAN, PENOLONG_KELAHIRAN, SEBAB_KEMATIAN, TEMPAT_DILAHIRKAN, YANG_MENERANGKAN_KEMATIAN,
} from '@/domain/mutasi/enum'
import {
  masukanDatangSchema, masukanLahirSchema, masukanMeninggalSchema, masukanPindahSchema, type MasukanDatang, type MasukanLahir,
  type MasukanMeninggal, type MasukanPindah,
} from '@/domain/mutasi/masukan'
import {
  AGAMA, HUBUNGAN_KELUARGA, JENIS_KELAMIN, PEKERJAAN, PENDIDIKAN, STATUS_PENDUDUK, STATUS_PERKAWINAN, type HubunganKeluarga,
} from '@/domain/penduduk/enum'
import { periksaNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Desa } from '@/domain/wilayah/schema'
import { opsiKeluargaSchema } from '../../keluarga/opsi-keluarga'

const atauKosong = <const T extends readonly [string, ...string[]]>(nilai: T) => z.union([z.enum(nilai), z.literal('')])
/** Penduduk yang dipilih lewat PilihPenduduk (objek utuh, untuk label dan KK-nya). */
const pendudukTerpilih = z.custom<Penduduk>((x) => typeof x === 'object' && x !== null && 'id' in x)

/* ---------- Kelahiran ---------- */

export const isianLahirSchema = z.object({
  ibu: pendudukTerpilih.nullable(),
  ayah: pendudukTerpilih.nullable(),
  nama: z.string(),
  jenisKelamin: atauKosong(JENIS_KELAMIN),
  tempatDilahirkan: atauKosong(TEMPAT_DILAHIRKAN),
  tempatLahir: z.string(),
  tanggalLahir: z.string(),
  jam: z.string(),
  jenisKelahiran: z.enum(JENIS_KELAHIRAN),
  anakKe: z.number().nullable(),
  penolong: atauKosong(PENOLONG_KELAHIRAN),
  beratGram: z.number().nullable(),
  panjangCm: z.number().nullable(),
  pelapor: z.string(),
})
export type IsianLahir = z.infer<typeof isianLahirSchema>

export function isianLahirAwal(hariIni: Date, tempatLahir: string): IsianLahir {
  return {
    ibu: null, ayah: null, nama: '', jenisKelamin: '', tempatDilahirkan: '', tempatLahir, tanggalLahir: tanggalIsoWib(hariIni), jam: '',
    jenisKelahiran: 'Tunggal', anakKe: null, penolong: '', beratGram: null, panjangCm: null, pelapor: '',
  }
}

export function buatSkemaLahir(hariIni: Date) {
  const hari = tanggalIsoWib(hariIni)
  return isianLahirSchema.superRefine((i, ctx) => {
    const salah = (path: keyof IsianLahir, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (i.ibu === null) salah('ibu', 'Pilih ibu')
    if (i.nama.trim() === '') salah('nama', 'Nama bayi wajib diisi')
    if (i.jenisKelamin === '') salah('jenisKelamin', 'Pilih jenis kelamin')
    if (i.tempatDilahirkan === '') salah('tempatDilahirkan', 'Pilih tempat dilahirkan')
    if (i.tempatLahir.trim() === '') salah('tempatLahir', 'Tempat lahir wajib diisi')
    if (i.tanggalLahir === '') salah('tanggalLahir', 'Tanggal lahir wajib diisi')
    else if (i.tanggalLahir > hari) salah('tanggalLahir', 'Tanggal lahir tidak boleh setelah hari ini')
    if (i.jam === '') salah('jam', 'Jam lahir wajib diisi')
    if (i.anakKe === null || i.anakKe < 1) salah('anakKe', 'Isi anak ke berapa')
    if (i.penolong === '') salah('penolong', 'Pilih penolong kelahiran')
    if (i.beratGram === null || i.beratGram < 500 || i.beratGram > 6000) salah('beratGram', 'Berat 500–6.000 gram')
    if (i.panjangCm === null || i.panjangCm < 30 || i.panjangCm > 65) salah('panjangCm', 'Panjang 30–65 cm')
    if (i.pelapor.trim() === '') salah('pelapor', 'Nama pelapor wajib diisi')
  })
}

export function keMasukanLahir(i: IsianLahir): MasukanLahir {
  return masukanLahirSchema.parse({
    ibuId: i.ibu?.id ?? '',
    ayahId: i.ayah?.id ?? null,
    pelapor: i.pelapor,
    bayi: {
      nama: i.nama, jenisKelamin: i.jenisKelamin, tempatLahir: i.tempatLahir, tanggalLahir: i.tanggalLahir, jam: i.jam,
      tempatDilahirkan: i.tempatDilahirkan, jenisKelahiran: i.jenisKelahiran, anakKe: i.anakKe, penolong: i.penolong,
      beratGram: i.beratGram, panjangCm: i.panjangCm,
    },
  })
}

/* ---------- Kematian ---------- */

export const isianMeninggalSchema = z.object({
  penduduk: pendudukTerpilih.nullable(),
  tanggal: z.string(),
  jam: z.string(),
  tempat: z.string(),
  sebab: atauKosong(SEBAB_KEMATIAN),
  yangMenerangkan: atauKosong(YANG_MENERANGKAN_KEMATIAN),
  pelapor: z.string(),
  penggantiKepalaId: z.string(),
})
export type IsianMeninggal = z.infer<typeof isianMeninggalSchema>

export function isianMeninggalAwal(penduduk: Penduduk | null, hariIni: Date): IsianMeninggal {
  return {
    penduduk, tanggal: tanggalIsoWib(hariIni), jam: '', tempat: '', sebab: '', yangMenerangkan: '', pelapor: '', penggantiKepalaId: '',
  }
}

export function buatSkemaMeninggal(hariIni: Date) {
  const hari = tanggalIsoWib(hariIni)
  return isianMeninggalSchema.superRefine((i, ctx) => {
    const salah = (path: keyof IsianMeninggal, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (i.penduduk === null) salah('penduduk', 'Pilih penduduk yang meninggal')
    if (i.tanggal === '') salah('tanggal', 'Tanggal meninggal wajib diisi')
    else if (i.tanggal > hari) salah('tanggal', 'Tanggal meninggal tidak boleh setelah hari ini')
    else if (i.penduduk && i.tanggal < i.penduduk.tanggalLahir) salah('tanggal', 'Tanggal meninggal tidak boleh sebelum tanggal lahir')
    if (i.jam === '') salah('jam', 'Jam meninggal wajib diisi')
    if (i.tempat.trim() === '') salah('tempat', 'Tempat meninggal wajib diisi')
    if (i.sebab === '') salah('sebab', 'Pilih sebab kematian')
    if (i.yangMenerangkan === '') salah('yangMenerangkan', 'Pilih yang menerangkan')
    if (i.pelapor.trim() === '') salah('pelapor', 'Nama pelapor wajib diisi')
  })
}

/** `wajibPengganti` dihitung layar dari KK (lihat usePengganti); bila tidak wajib, pengganti tidak dikirim. */
export function keMasukanMeninggal(i: IsianMeninggal, wajibPengganti: boolean): MasukanMeninggal {
  return masukanMeninggalSchema.parse({
    pendudukId: i.penduduk?.id ?? '', tanggal: i.tanggal, jam: i.jam, tempat: i.tempat, sebab: i.sebab,
    yangMenerangkan: i.yangMenerangkan, pelapor: i.pelapor,
    penggantiKepalaId: wajibPengganti && i.penggantiKepalaId !== '' ? i.penggantiKepalaId : null,
  })
}

/* ---------- Pindah keluar ---------- */

export const isianPindahSchema = z.object({
  penduduk: pendudukTerpilih.nullable(),
  /** Satu orang saja, atau seluruh anggota KK-nya (SPEC §6.6). */
  cakupan: z.enum(['orang', 'kk']),
  provinsi: z.string(),
  kabupaten: z.string(),
  kecamatan: z.string(),
  desa: z.string(),
  alamat: z.string(),
  alasan: atauKosong(ALASAN_PINDAH),
  tanggal: z.string(),
  penggantiKepalaId: z.string(),
})
export type IsianPindah = z.infer<typeof isianPindahSchema>

export function isianPindahAwal(penduduk: Penduduk | null, hariIni: Date): IsianPindah {
  return {
    penduduk, cakupan: 'orang', provinsi: '', kabupaten: '', kecamatan: '', desa: '', alamat: '', alasan: '',
    tanggal: tanggalIsoWib(hariIni), penggantiKepalaId: '',
  }
}

export function buatSkemaPindah(hariIni: Date) {
  const hari = tanggalIsoWib(hariIni)
  return isianPindahSchema.superRefine((i, ctx) => {
    const salah = (path: keyof IsianPindah, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (i.penduduk === null) salah('penduduk', 'Pilih penduduk yang pindah')
    if (i.provinsi.trim() === '') salah('provinsi', 'Provinsi tujuan wajib diisi')
    if (i.kabupaten.trim() === '') salah('kabupaten', 'Kabupaten/kota tujuan wajib diisi')
    if (i.kecamatan.trim() === '') salah('kecamatan', 'Kecamatan tujuan wajib diisi')
    if (i.desa.trim() === '') salah('desa', 'Desa/kelurahan tujuan wajib diisi')
    if (i.alasan === '') salah('alasan', 'Pilih alasan pindah')
    if (i.tanggal === '') salah('tanggal', 'Tanggal pindah wajib diisi')
    else if (i.tanggal > hari) salah('tanggal', 'Tanggal pindah tidak boleh setelah hari ini')
  })
}

export function keMasukanPindah(i: IsianPindah, pendudukIds: readonly string[], wajibPengganti: boolean): MasukanPindah {
  return masukanPindahSchema.parse({
    pendudukIds,
    tanggal: i.tanggal,
    tujuan: { provinsi: i.provinsi, kabupaten: i.kabupaten, kecamatan: i.kecamatan, desa: i.desa, alamat: i.alamat.trim() },
    alasan: i.alasan,
    penggantiKepalaId: wajibPengganti && i.penggantiKepalaId !== '' ? i.penggantiKepalaId : null,
  })
}

/* ---------- Kedatangan ---------- */

export const isianAnggotaDatangSchema = z.object({
  nik: z.string(),
  nama: z.string(),
  jenisKelamin: atauKosong(JENIS_KELAMIN),
  tempatLahir: z.string(),
  tanggalLahir: z.string(),
  agama: atauKosong(AGAMA),
  hubunganKeluarga: atauKosong(HUBUNGAN_KELUARGA),
  statusPerkawinan: atauKosong(STATUS_PERKAWINAN),
  pendidikan: atauKosong(PENDIDIKAN),
  pekerjaan: atauKosong(PEKERJAAN),
})
export type IsianAnggotaDatang = z.infer<typeof isianAnggotaDatangSchema>

export const isianDatangSchema = z.object({
  nomorSkpwni: z.string(),
  provinsi: z.string(),
  kabupaten: z.string(),
  kecamatan: z.string(),
  desa: z.string(),
  alamat: z.string(),
  tanggal: z.string(),
  keluargaJenis: z.enum(['ada', 'baru']),
  keluarga: opsiKeluargaSchema.nullable(),
  dusunId: z.string(),
  rw: z.string(),
  rt: z.string(),
  statusPenduduk: z.enum(STATUS_PENDUDUK),
  anggota: z.array(isianAnggotaDatangSchema),
})
export type IsianDatang = z.infer<typeof isianDatangSchema>

export function anggotaDatangKosong(hubungan: HubunganKeluarga | '' = ''): IsianAnggotaDatang {
  return {
    nik: '', nama: '', jenisKelamin: '', tempatLahir: '', tanggalLahir: '', agama: '', hubunganKeluarga: hubungan,
    statusPerkawinan: '', pendidikan: '', pekerjaan: '',
  }
}

export function isianDatangAwal(hariIni: Date): IsianDatang {
  return {
    nomorSkpwni: '', provinsi: '', kabupaten: '', kecamatan: '', desa: '', alamat: '', tanggal: tanggalIsoWib(hariIni),
    keluargaJenis: 'baru', keluarga: null, dusunId: '', rw: '', rt: '', statusPenduduk: 'Tetap',
    anggota: [anggotaDatangKosong('Kepala Keluarga')],
  }
}

export function buatSkemaDatang(hariIni: Date, istilah: Desa['istilahWilayah']) {
  const hari = tanggalIsoWib(hariIni)
  return isianDatangSchema.superRefine((i, ctx) => {
    const salah = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    if (i.nomorSkpwni.trim() === '') salah(['nomorSkpwni'], 'Nomor SKPWNI wajib diisi')
    if (i.provinsi.trim() === '') salah(['provinsi'], 'Provinsi asal wajib diisi')
    if (i.kabupaten.trim() === '') salah(['kabupaten'], 'Kabupaten/kota asal wajib diisi')
    if (i.kecamatan.trim() === '') salah(['kecamatan'], 'Kecamatan asal wajib diisi')
    if (i.desa.trim() === '') salah(['desa'], 'Desa/kelurahan asal wajib diisi')
    if (i.tanggal === '') salah(['tanggal'], 'Tanggal datang wajib diisi')
    else if (i.tanggal > hari) salah(['tanggal'], 'Tanggal datang tidak boleh setelah hari ini')
    if (i.keluargaJenis === 'ada' && i.keluarga === null) salah(['keluarga'], 'Pilih KK, atau buat KK baru')
    if (i.keluargaJenis === 'baru') {
      if (i.dusunId === '') salah(['dusunId'], `Pilih ${istilah.dusun.toLowerCase()}`)
      if (i.rw === '') salah(['rw'], `Pilih ${istilah.rw}`)
      if (i.rt === '') salah(['rt'], `Pilih ${istilah.rt}`)
    }
    i.anggota.forEach((a, n) => {
      if (a.nik === '') salah(['anggota', n, 'nik'], 'NIK asal wajib diisi')
      else {
        const hasil = periksaNik(a.nik, hariIni)
        if (hasil.status === 'tidak-lengkap' || hasil.status === 'tidak-valid') salah(['anggota', n, 'nik'], hasil.pesan)
        else if (i.anggota.findIndex((x) => x.nik === a.nik) !== n) salah(['anggota', n, 'nik'], 'NIK ini sudah dipakai anggota lain')
      }
      if (a.nama.trim() === '') salah(['anggota', n, 'nama'], 'Nama lengkap wajib diisi')
      if (a.jenisKelamin === '') salah(['anggota', n, 'jenisKelamin'], 'Pilih jenis kelamin')
      if (a.tempatLahir.trim() === '') salah(['anggota', n, 'tempatLahir'], 'Tempat lahir wajib diisi')
      if (a.tanggalLahir === '') salah(['anggota', n, 'tanggalLahir'], 'Tanggal lahir wajib diisi')
      else if (a.tanggalLahir > hari) salah(['anggota', n, 'tanggalLahir'], 'Tanggal lahir tidak boleh setelah hari ini')
      if (a.agama === '') salah(['anggota', n, 'agama'], 'Pilih agama')
      if (a.hubunganKeluarga === '') salah(['anggota', n, 'hubunganKeluarga'], 'Pilih hubungan dalam keluarga')
    })
    const jumlahKepala = i.anggota.filter((a) => a.hubunganKeluarga === 'Kepala Keluarga').length
    if (i.keluargaJenis === 'baru' && jumlahKepala !== 1) salah(['anggota', 'root'], 'KK baru harus punya tepat satu kepala keluarga')
    if (i.keluargaJenis === 'ada' && jumlahKepala > 0) salah(['anggota', 'root'], 'KK tujuan sudah punya kepala keluarga')
  })
}

export function keMasukanDatang(i: IsianDatang, hariIni: Date): MasukanDatang {
  return masukanDatangSchema.parse({
    nomorSkpwni: i.nomorSkpwni,
    tanggal: i.tanggal,
    asal: { provinsi: i.provinsi, kabupaten: i.kabupaten, kecamatan: i.kecamatan, desa: i.desa, alamat: i.alamat.trim() },
    keluarga: i.keluargaJenis === 'baru' ? { jenis: 'baru', dusunId: i.dusunId, rw: i.rw, rt: i.rt } : { jenis: 'ada', id: i.keluarga?.id ?? '' },
    statusPenduduk: i.statusPenduduk,
    anggota: i.anggota.map((a) => ({
      nik: a.nik, nama: a.nama, jenisKelamin: a.jenisKelamin, golonganDarah: 'Tidak Tahu', agama: a.agama, kewarganegaraan: 'WNI',
      tempatLahir: a.tempatLahir, tanggalLahir: a.tanggalLahir, nomorAktaLahir: null, hubunganKeluarga: a.hubunganKeluarga,
      namaAyah: '', namaIbu: '', pendidikan: a.pendidikan || null, pekerjaan: a.pekerjaan || null,
      statusPerkawinan: a.statusPerkawinan || null,
      // Pendatang dewasa umumnya sudah punya KTP-el dari daerah asal; datanya bisa diperbaiki lewat Ubah.
      ktpEl: hitungUmur(a.tanggalLahir, hariIni).tahun >= 17 ? 'Sudah rekam' : 'Belum wajib',
      telepon: null, catatan: null,
    })),
  })
}
