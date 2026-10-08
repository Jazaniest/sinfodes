import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { daftarPerubahan, teksNilaiRiwayat } from './perubahan'

describe('perubahan data penduduk untuk Riwayat (SPEC §6.4)', () => {
  it('hanya field yang benar-benar berubah, berurutan menurut FIELD_RIWAYAT', () => {
    const ubah = { pekerjaan: 'Wiraswasta', nama: 'Siti Rahmah', pendidikan: 'Diploma I/II', telepon: '081277402231' } as const
    expect(daftarPerubahan(contohPenduduk(), ubah)).toEqual([
      { field: 'pendidikan', nilaiLama: 'SLTA/Sederajat', nilaiBaru: 'Diploma I/II' },
      { field: 'pekerjaan', nilaiLama: 'Mengurus Rumah Tangga', nilaiBaru: 'Wiraswasta' },
    ])
  })
  it('nilai ditulis seperti dibaca orang: NIK berkelompok, jenis kelamin, tanggal panjang', () => {
    const ubah = { tanggalLahir: '1991-03-13', jenisKelamin: 'L', nik: '1405091203918002' } as const
    expect(daftarPerubahan(contohPenduduk(), ubah)).toEqual([
      { field: 'nik', nilaiLama: '140509 520391 8002', nilaiBaru: '140509 120391 8002' },
      { field: 'jenisKelamin', nilaiLama: 'Perempuan', nilaiBaru: 'Laki-laki' },
      { field: 'tanggalLahir', nilaiLama: '12 Maret 1991', nilaiBaru: '13 Maret 1991' },
    ])
  })
  it('nilai kosong dicatat sebagai null', () => {
    expect(daftarPerubahan(contohPenduduk(), { telepon: null })).toEqual([
      { field: 'telepon', nilaiLama: '081277402231', nilaiBaru: null },
    ])
    expect(teksNilaiRiwayat('catatan', '')).toBeNull()
    expect(teksNilaiRiwayat('catatan', null)).toBeNull()
  })
})
