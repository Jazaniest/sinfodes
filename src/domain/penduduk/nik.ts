import { pad2, tahunDariDuaDigit, tanggalValid } from '../format/kalender'
import { BULAN_PENDEK } from '../format/tanggal'
import { PROVINSI, namaWilayah } from '../wilayah/kode-wilayah'
import type { JenisKelamin } from './enum'

export type HasilNik =
  | { status: 'kosong'; digit: '' }
  | { status: 'tidak-lengkap'; digit: string; pesan: string }
  | { status: 'tidak-valid'; digit: string; pesan: string }
  | {
      status: 'valid'
      digit: string
      kodeWilayah: string
      jenisKelamin: JenisKelamin
      tanggalLahir: string
      nomorUrut: string
      namaWilayah: string | null
      peringatan: string[]
    }

export type NikValid = Extract<HasilNik, { status: 'valid' }>

/** Hanya angka, maksimal 16 digit. */
export function bersihkanNik(masukan: string): string {
  return masukan.replace(/\D/g, '').slice(0, 16)
}

/** Wilayah (6) · tanggal (6) · nomor urut (4). Berlaku juga untuk masukan yang belum lengkap. */
export function kelompokkanNik(digit: string): string {
  return [digit.slice(0, 6), digit.slice(6, 12), digit.slice(12, 16)].filter(Boolean).join(' ')
}

export function periksaNik(masukan: string, hariIni: Date = new Date()): HasilNik {
  const digit = bersihkanNik(masukan)
  if (digit.length === 0) return { status: 'kosong', digit: '' }
  if (digit.length < 16) return { status: 'tidak-lengkap', digit, pesan: `NIK harus 16 angka — baru ${digit.length}` }

  const kodeWilayah = digit.slice(0, 6)
  const dd = Number(digit.slice(6, 8))
  const bulan = Number(digit.slice(8, 10))
  const yy = Number(digit.slice(10, 12))
  const nomorUrut = digit.slice(12, 16)
  const jenisKelamin: JenisKelamin = dd > 40 ? 'P' : 'L'
  const hari = dd > 40 ? dd - 40 : dd
  const tahun = tahunDariDuaDigit(yy, bulan, hari, hariIni)

  if (!tanggalValid(tahun, bulan, hari)) return { status: 'tidak-valid', digit, pesan: 'Tanggal di NIK tidak valid' }
  if (nomorUrut === '0000') return { status: 'tidak-valid', digit, pesan: 'Nomor urut NIK tidak boleh 0000' }

  const peringatan: string[] = []
  const kodeProvinsi = kodeWilayah.slice(0, 2)
  if (!(kodeProvinsi in PROVINSI)) peringatan.push(`Kode provinsi ${kodeProvinsi} tidak dikenal`)

  return {
    status: 'valid',
    digit,
    kodeWilayah,
    jenisKelamin,
    tanggalLahir: `${tahun}-${pad2(bulan)}-${pad2(hari)}`,
    nomorUrut,
    namaWilayah: namaWilayah(kodeWilayah),
    peringatan,
  }
}

/** "Perempuan · lahir 12 Mar 1991 · terdaftar di Teluk Meranti, Pelalawan" */
export function ringkasanNik(hasil: NikValid): string {
  const [tahun, bulan, hari] = hasil.tanggalLahir.split('-').map(Number)
  const jk = hasil.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'
  const tempat = hasil.namaWilayah ? ` · terdaftar di ${hasil.namaWilayah}` : ''
  return `${jk} · lahir ${hari} ${BULAN_PENDEK[bulan - 1]} ${tahun}${tempat}`
}

/** "Kode wilayah 14.05.09 Teluk Meranti · Lahir 12-03-1991 · Perempuan · No. urut 8002" */
export function artiNik(hasil: NikValid): string {
  const k = hasil.kodeWilayah
  const wilayah = hasil.namaWilayah ? ` ${hasil.namaWilayah.split(',')[0]}` : ''
  const [tahun, bulan, hari] = hasil.tanggalLahir.split('-')
  const jk = hasil.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'
  return `Kode wilayah ${k.slice(0, 2)}.${k.slice(2, 4)}.${k.slice(4, 6)}${wilayah} · Lahir ${hari}-${bulan}-${tahun} · ${jk} · No. urut ${hasil.nomorUrut}`
}

export function buatNik(p: {
  kodeWilayah: string
  tanggalLahir: string
  jenisKelamin: JenisKelamin
  nomorUrut: number
}): string {
  const [tahun, bulan, hari] = p.tanggalLahir.split('-').map(Number)
  const dd = p.jenisKelamin === 'P' ? hari + 40 : hari
  return `${p.kodeWilayah}${pad2(dd)}${pad2(bulan)}${pad2(tahun % 100)}${String(p.nomorUrut).padStart(4, '0')}`
}
