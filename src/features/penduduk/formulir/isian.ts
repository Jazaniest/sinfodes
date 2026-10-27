import { z } from 'zod'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import {
  AGAMA, GOLONGAN_DARAH, HUBUNGAN_KELUARGA, JENIS_KELAMIN, KEWARGANEGARAAN, KTP_EL, PEKERJAAN, PENDIDIKAN, STATUS_PENDUDUK,
  STATUS_PERKAWINAN,
} from '@/domain/penduduk/enum'
import {
  biodataDari, biodataSchema, masukanPendudukSchema, ubahPendudukSchema, type MasukanPenduduk, type UbahPenduduk,
} from '@/domain/penduduk/masukan'
import { periksaNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Desa } from '@/domain/wilayah/schema'
import { opsiKeluargaSchema, type OpsiKeluarga } from '../../keluarga/opsi-keluarga'

const atauKosong = <const T extends readonly [string, ...string[]]>(nilai: T) => z.union([z.enum(nilai), z.literal('')])

/** Nilai formulir penduduk. Pilihan yang belum dipilih diwakili '' supaya formulir bisa dimulai kosong (SPEC §6.4). */
export const isianPendudukSchema = z.object({
  nik: z.string(),
  nama: z.string(),
  jenisKelamin: atauKosong(JENIS_KELAMIN),
  golonganDarah: z.enum(GOLONGAN_DARAH),
  agama: atauKosong(AGAMA),
  kewarganegaraan: z.enum(KEWARGANEGARAAN),
  tempatLahir: z.string(),
  tanggalLahir: z.string(),
  nomorAktaLahir: z.string(),
  keluargaJenis: z.enum(['ada', 'baru']),
  keluarga: opsiKeluargaSchema.nullable(),
  dusunId: z.string(),
  rw: z.string(),
  rt: z.string(),
  hubunganKeluarga: atauKosong(HUBUNGAN_KELUARGA),
  namaAyah: z.string(),
  namaIbu: z.string(),
  pendidikan: atauKosong(PENDIDIKAN),
  pekerjaan: atauKosong(PEKERJAAN),
  statusPerkawinan: atauKosong(STATUS_PERKAWINAN),
  statusPenduduk: z.enum(STATUS_PENDUDUK),
  ktpEl: z.enum(KTP_EL),
  telepon: z.string(),
  catatan: z.string(),
})
export type IsianPenduduk = z.infer<typeof isianPendudukSchema>

/** Untuk draf: isi localStorage yang bentuknya lain diabaikan (fokus review 5). */
export const cocokIsianPenduduk = (x: unknown): x is IsianPenduduk => isianPendudukSchema.safeParse(x).success

export function isianKosong(keluarga: OpsiKeluarga | null): IsianPenduduk {
  return {
    nik: '', nama: '', jenisKelamin: '', golonganDarah: 'Tidak Tahu', agama: '', kewarganegaraan: 'WNI', tempatLahir: '',
    tanggalLahir: '', nomorAktaLahir: '', keluargaJenis: 'ada', keluarga, dusunId: '', rw: '', rt: '', hubunganKeluarga: '',
    namaAyah: '', namaIbu: '', pendidikan: '', pekerjaan: '', statusPerkawinan: '', statusPenduduk: 'Tetap', ktpEl: 'Sudah rekam',
    telepon: '', catatan: '',
  }
}

export function isianDariPenduduk(p: Penduduk, keluarga: OpsiKeluarga): IsianPenduduk {
  return {
    nik: p.nik ?? '', nama: p.nama, jenisKelamin: p.jenisKelamin, golonganDarah: p.golonganDarah, agama: p.agama,
    kewarganegaraan: p.kewarganegaraan, tempatLahir: p.tempatLahir, tanggalLahir: p.tanggalLahir,
    nomorAktaLahir: p.nomorAktaLahir ?? '', keluargaJenis: 'ada', keluarga, dusunId: '', rw: '', rt: '',
    hubunganKeluarga: p.hubunganKeluarga, namaAyah: p.namaAyah, namaIbu: p.namaIbu, pendidikan: p.pendidikan ?? '',
    pekerjaan: p.pekerjaan ?? '', statusPerkawinan: p.statusPerkawinan ?? '', statusPenduduk: p.statusPenduduk, ktpEl: p.ktpEl,
    telepon: p.telepon ?? '', catatan: p.catatan ?? '',
  }
}

const bersihkanTelepon = (t: string) => t.replace(/[\s.-]/g, '')
const kosongJadiNull = (t: string) => (t.trim() === '' ? null : t.trim())

/** Aturan isian beserta pesannya. `hariIni` dan istilah wilayah desa datang dari layar. */
export function buatSkemaIsian(hariIni: Date, istilah: Desa['istilahWilayah']) {
  const hari = tanggalIsoWib(hariIni)
  return isianPendudukSchema.superRefine((i, ctx) => {
    const salah = (path: keyof IsianPenduduk, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (i.nik !== '') {
      const hasil = periksaNik(i.nik, hariIni)
      if (hasil.status === 'tidak-lengkap' || hasil.status === 'tidak-valid') salah('nik', hasil.pesan)
    }
    if (i.nama.trim() === '') salah('nama', 'Nama lengkap wajib diisi')
    if (i.jenisKelamin === '') salah('jenisKelamin', 'Pilih jenis kelamin')
    if (i.agama === '') salah('agama', 'Pilih agama')
    if (i.tempatLahir.trim() === '') salah('tempatLahir', 'Tempat lahir wajib diisi')
    if (i.tanggalLahir === '') salah('tanggalLahir', 'Tanggal lahir wajib diisi')
    else if (i.tanggalLahir > hari) salah('tanggalLahir', 'Tanggal lahir tidak boleh setelah hari ini')
    if (i.keluargaJenis === 'ada' && i.keluarga === null) salah('keluarga', 'Pilih KK, atau buat KK baru')
    if (i.keluargaJenis === 'baru') {
      if (i.dusunId === '') salah('dusunId', `Pilih ${istilah.dusun.toLowerCase()}`)
      if (i.rw === '') salah('rw', `Pilih ${istilah.rw}`)
      if (i.rt === '') salah('rt', `Pilih ${istilah.rt}`)
    }
    if (i.hubunganKeluarga === '') salah('hubunganKeluarga', 'Pilih hubungan dalam keluarga')
    const telepon = bersihkanTelepon(i.telepon)
    if (telepon !== '' && !/^08\d{8,11}$/.test(telepon)) salah('telepon', 'Nomor telepon diawali 08, 10-13 angka')
  })
}

/** Isian yang sudah lolos aturan → isi POST /penduduk. */
export function keMasukan(i: IsianPenduduk): MasukanPenduduk {
  return masukanPendudukSchema.parse({
    nik: i.nik === '' ? null : i.nik,
    nama: i.nama,
    jenisKelamin: i.jenisKelamin,
    golonganDarah: i.golonganDarah,
    agama: i.agama,
    kewarganegaraan: i.kewarganegaraan,
    tempatLahir: i.tempatLahir,
    tanggalLahir: i.tanggalLahir,
    nomorAktaLahir: kosongJadiNull(i.nomorAktaLahir),
    hubunganKeluarga: i.hubunganKeluarga,
    namaAyah: i.namaAyah,
    namaIbu: i.namaIbu,
    pendidikan: i.pendidikan || null,
    pekerjaan: i.pekerjaan || null,
    statusPerkawinan: i.statusPerkawinan || null,
    statusPenduduk: i.statusPenduduk,
    ktpEl: i.ktpEl,
    telepon: kosongJadiNull(bersihkanTelepon(i.telepon)),
    catatan: kosongJadiNull(i.catatan),
    keluarga:
      i.keluargaJenis === 'baru'
        ? { jenis: 'baru', dusunId: i.dusunId, rw: i.rw, rt: i.rt }
        : { jenis: 'ada', id: i.keluarga?.id ?? '' },
  })
}

/** Field biodata yang berbeda dari data asli → isi PATCH. Objek kosong berarti tidak ada perubahan. */
export function perubahanBiodata(asli: Penduduk, masukan: MasukanPenduduk): UbahPenduduk {
  const lama = biodataDari(asli)
  const baru = biodataSchema.parse(masukan)
  const beda = Object.fromEntries(Object.entries(baru).filter(([kunci, nilai]) => lama[kunci as keyof typeof lama] !== nilai))
  return ubahPendudukSchema.parse(beda)
}
