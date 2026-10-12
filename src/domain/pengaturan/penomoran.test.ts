import { describe, expect, it } from 'vitest'
import { FORMAT_NOMOR_BAWAAN } from '../surat/nomor-surat'
import { contohNomor, pecahFormat, periksaFormat, susunFormat, ubahPenomoranSchema } from './penomoran'

describe('penomoran surat (SPEC §7.2)', () => {
  it('format bawaan dipecah menjadi potongan dan pemisah, lalu disusun kembali', () => {
    expect(pecahFormat(FORMAT_NOMOR_BAWAAN)).toEqual({ keping: ['klasifikasi', 'urut', 'kodeDesa', 'bulanRomawi', 'tahun'], pemisah: '/' })
    expect(susunFormat(['tahun', 'urut', 'kodeDesa'], '-')).toBe('{tahun}-{urut}-{kodeDesa}')
    expect(pecahFormat('{tahun}-{urut}-{kodeDesa}')).toEqual({ keping: ['tahun', 'urut', 'kodeDesa'], pemisah: '-' })
    expect(pecahFormat('{urut}/{nama}')).toBeNull()
    expect(pecahFormat('{urut}/{tahun}-{kodeDesa}')).toBeNull()
  })
  it('format yang bisa menghasilkan nomor kembar ditolak (fokus review 3)', () => {
    expect(periksaFormat(['klasifikasi', 'kodeDesa', 'tahun'], 'per-tahun')).toBe('Format wajib memuat nomor urut.')
    expect(periksaFormat(['urut', 'kodeDesa'], 'per-tahun')).toBe('Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.')
    // Kode klasifikasi tidak cukup: SKTM dan SKP sama-sama 400, jadi nomor pertama keduanya akan kembar.
    expect(periksaFormat(['klasifikasi', 'urut', 'kodeDesa', 'tahun'], 'per-jenis')).toBe(
      'Urutan per jenis surat wajib memuat kode jenis surat, supaya nomor antar-jenis tidak kembar.',
    )
    expect(periksaFormat(['klasifikasi', 'kodeJenis', 'urut', 'tahun'], 'per-jenis')).toBeNull()
    expect(periksaFormat(['urut', 'urut', 'tahun'], 'per-tahun')).toBe('Setiap potongan hanya boleh dipakai sekali.')
    expect(periksaFormat(['urut', 'kodeDesa', 'tahun'], 'per-tahun')).toBeNull()
  })
  it('isian PUT: kode desa menjadi huruf besar; format diperiksa', () => {
    expect(ubahPenomoranSchema.parse({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: ' ss ' }).kodeSurat).toBe('SS')
    expect(ubahPenomoranSchema.safeParse({ formatNomor: '{urut}/{kodeDesa}', urutan: 'per-tahun', kodeSurat: 'SS' }).error?.issues[0]).toMatchObject({
      path: ['formatNomor'], message: 'Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.',
    })
    expect(ubahPenomoranSchema.safeParse({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS-01' }).success).toBe(false)
  })
  it('pratinjau nomor berikutnya mengikuti format dan urutan yang dipilih', () => {
    const contoh = { jenis: 'Surat Keterangan Domisili', kode: 'SKD', klasifikasi: '470', urutPerTahun: 88, urutPerJenis: 12 }
    expect(contohNomor({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS' }, contoh, '2026-09-24')).toBe('470/088/SS/IX/2026')
    expect(contohNomor({ formatNomor: '{tahun}-{kodeJenis}-{urut}', urutan: 'per-jenis', kodeSurat: 'SS' }, contoh, '2026-09-24')).toBe(
      '2026-SKD-012',
    )
  })
})
