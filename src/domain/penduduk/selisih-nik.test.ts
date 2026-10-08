import { describe, expect, it } from 'vitest'
import { periksaNik } from './nik'
import { selisihDenganNik } from './selisih-nik'

const HARI_INI = new Date('2026-09-24T02:00:00Z')

function nikValid(nik: string) {
  const hasil = periksaNik(nik, HARI_INI)
  if (hasil.status !== 'valid') throw new Error('NIK contoh harus valid')
  return hasil
}

describe('selisih data dengan NIK (SPEC §6.4: peringatan, bukan galat)', () => {
  const siti = nikValid('1405095203918002')
  it('cocok → tanpa peringatan', () => {
    expect(selisihDenganNik(siti, { jenisKelamin: 'P', tanggalLahir: '1991-03-12' })).toEqual([])
  })
  it('berbeda → pesan menyebut isi NIK', () => {
    expect(selisihDenganNik(siti, { jenisKelamin: 'L', tanggalLahir: '1991-03-13' })).toEqual([
      'Tanggal lahir berbeda dengan NIK (12 Mar 1991)',
      'Jenis kelamin berbeda dengan NIK (Perempuan)',
    ])
  })
  it('isian yang masih kosong tidak diperingatkan', () => {
    expect(selisihDenganNik(siti, { jenisKelamin: '', tanggalLahir: '' })).toEqual([])
  })
})
