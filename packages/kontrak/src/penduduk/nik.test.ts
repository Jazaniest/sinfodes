import { describe, expect, it } from 'vitest'
import { artiNik, bersihkanNik, buatNik, kelompokkanNik, periksaNik, ringkasanNik } from './nik'

const HARI_INI = new Date('2026-09-24T02:30:00Z')

describe('bersihkanNik dan kelompokkanNik', () => {
  it('membuang spasi, titik, strip, lalu memotong 16 digit', () =>
    expect(bersihkanNik('1405 0952.0391-8002 99')).toBe('1405095203918002'))
  it('mengelompokkan per makna', () => expect(kelompokkanNik('1405095203918002')).toBe('140509 520391 8002'))
  it('masukan yang belum lengkap', () => expect(kelompokkanNik('14050952')).toBe('140509 52'))
})

describe('periksaNik', () => {
  it('kosong', () => expect(periksaNik('', HARI_INI)).toEqual({ status: 'kosong', digit: '' }))
  it('kurang dari 16 angka', () =>
    expect(periksaNik('140509520391800', HARI_INI)).toMatchObject({
      status: 'tidak-lengkap',
      pesan: 'NIK harus 16 angka — baru 15',
    }))
  it('perempuan: tanggal ditambah 40', () =>
    expect(periksaNik('1405095203918002', HARI_INI)).toMatchObject({
      status: 'valid',
      jenisKelamin: 'P',
      tanggalLahir: '1991-03-12',
      nomorUrut: '8002',
      namaWilayah: 'Teluk Meranti, Pelalawan',
      peringatan: [],
    }))
  it('laki-laki', () =>
    expect(periksaNik('1405091706848005', HARI_INI)).toMatchObject({
      status: 'valid',
      jenisKelamin: 'L',
      tanggalLahir: '1984-06-17',
    }))
  it('tahun yang akan datang dibaca abad 1900', () =>
    expect(periksaNik('1405093012268001', HARI_INI)).toMatchObject({ tanggalLahir: '1926-12-30' }))
  it('tahun yang sudah lewat dibaca abad 2000', () =>
    expect(periksaNik('1405090201238001', HARI_INI)).toMatchObject({ tanggalLahir: '2023-01-02' }))
  it('tanggal yang tidak ada', () =>
    expect(periksaNik('1405093102918001', HARI_INI)).toMatchObject({
      status: 'tidak-valid',
      pesan: 'Tanggal di NIK tidak valid',
    }))
  it('nomor urut 0000', () =>
    expect(periksaNik('1405095203910000', HARI_INI)).toMatchObject({
      status: 'tidak-valid',
      pesan: 'Nomor urut NIK tidak boleh 0000',
    }))
  it('kabupaten asal pendatang dikenali', () =>
    expect(periksaNik('3310014802768001', HARI_INI)).toMatchObject({
      status: 'valid',
      namaWilayah: 'Klaten, Jawa Tengah',
    }))
  it('provinsi tak dikenal hanya jadi peringatan', () =>
    expect(periksaNik('9905091706848005', HARI_INI)).toMatchObject({
      status: 'valid',
      namaWilayah: null,
      peringatan: ['Kode provinsi 99 tidak dikenal'],
    }))
})

describe('buatNik, ringkasanNik, artiNik', () => {
  it('buatNik kebalikan dari periksaNik', () =>
    expect(buatNik({ kodeWilayah: '140509', tanggalLahir: '1991-03-12', jenisKelamin: 'P', nomorUrut: 8002 })).toBe(
      '1405095203918002',
    ))
  it('ringkasan untuk kolom isian', () => {
    const hasil = periksaNik('1405095203918002', HARI_INI)
    if (hasil.status !== 'valid') throw new Error('seharusnya valid')
    expect(ringkasanNik(hasil)).toBe('Perempuan · lahir 12 Mar 1991 · terdaftar di Teluk Meranti, Pelalawan')
  })
  it('arti untuk tooltip', () => {
    const hasil = periksaNik('1405095203918002', HARI_INI)
    if (hasil.status !== 'valid') throw new Error('seharusnya valid')
    expect(artiNik(hasil)).toBe('Kode wilayah 14.05.09 Teluk Meranti · Lahir 12-03-1991 · Perempuan · No. urut 8002')
  })
})
