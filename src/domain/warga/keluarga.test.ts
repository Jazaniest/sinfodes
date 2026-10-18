import { describe, expect, it } from 'vitest'
import { FIELD_LAPORAN } from '@/domain/laporan/schema'
import { periksaNilaiLaporan, pilihanLaporan, samarkanNomorKk } from './keluarga'

const HARI_INI = '2026-09-24'

describe('laporan data dari warga (SPEC §10, fokus review 5)', () => {
  it('field berpilihan harus diisi dari daftar', () => {
    expect(pilihanLaporan('pekerjaan')).toContain('Wiraswasta')
    expect(pilihanLaporan('nama')).toBeNull()
    expect(periksaNilaiLaporan('pekerjaan', 'Wiraswasta', 'Nelayan/Perikanan', HARI_INI)).toBeNull()
    expect(periksaNilaiLaporan('pekerjaan', 'Pengusaha sukses', null, HARI_INI)).toBe('Pilih pekerjaan dari daftar.')
  })
  it('tanggal lahir harus sah dan tidak di masa depan', () => {
    expect(periksaNilaiLaporan('tanggalLahir', '1991-03-21', '1991-03-12', HARI_INI)).toBeNull()
    expect(periksaNilaiLaporan('tanggalLahir', '1991-02-30', null, HARI_INI)).toBe('Tanggal lahir tidak valid.')
    expect(periksaNilaiLaporan('tanggalLahir', '2027-01-01', null, HARI_INI)).toBe('Tanggal lahir tidak boleh sesudah hari ini.')
  })
  it('field yang diketik mengikuti aturan formulir penduduk', () => {
    expect(periksaNilaiLaporan('telepon', '12345', null, HARI_INI)).toBe('Nomor telepon diawali 08, 10-13 angka')
    expect(periksaNilaiLaporan('namaIbu', 'Rosnah binti Ali', 'Rosnah', HARI_INI)).toBeNull()
  })
  it('kosong atau sama dengan data sekarang ditolak', () => {
    expect(periksaNilaiLaporan('nama', '  ', 'Siti Rahmah', HARI_INI)).toBe('Tulis nilai yang benar.')
    expect(periksaNilaiLaporan('agama', 'Islam', 'Islam', HARI_INI)).toBe('Nilai ini sama dengan agama yang tercatat sekarang.')
  })
  it('NIK tidak bisa dilaporkan lewat layanan warga', () => {
    expect(FIELD_LAPORAN).not.toContain('nik')
  })
  it('nomor KK disamarkan seperti NIK', () => {
    expect(samarkanNomorKk('1405092011238004')).toBe('•••• •••• •••• 8004')
  })
})
