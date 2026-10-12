import { describe, expect, it } from 'vitest'
import { calonUntuk, namaSyarat, nomorTiket, syaratWajib, teksPerkiraan } from './ajukan'

describe('ajukan surat dari layanan warga (SPEC §10)', () => {
  it('syarat bertanda "(opsional)" boleh dilewati; namanya tampil tanpa tanda itu', () => {
    expect(syaratWajib('KTP')).toBe(true)
    expect(syaratWajib('Foto tempat usaha (opsional)')).toBe(false)
    expect(namaSyarat('Foto tempat usaha (opsional)')).toBe('Foto tempat usaha')
  })
  it('perkiraan waktu dalam kalimat sederhana', () => {
    expect(teksPerkiraan(0)).toBe('Biasanya selesai di hari yang sama.')
    expect(teksPerkiraan(2)).toBe('Biasanya selesai dalam 2 hari kerja.')
    expect(teksPerkiraan(null)).toBe('Lama prosesnya belum bisa diperkirakan.')
  })
  it('nomor tiket dari tahun masuk dan nomor urut', () => {
    expect(nomorTiket({ masukPada: '2026-10-12T20:01:00+07:00', noUrut: 581 })).toBe('2026-0581')
  })
  it('untuk siapa: surat kelahiran hanya untuk bayi di bawah 12 bulan; surat kematian tidak online (fokus review 3)', () => {
    const anggota = [{ id: 'ibu', umurBulan: 420 }, { id: 'kakak', umurBulan: 34 }, { id: 'bayi', umurBulan: 2 }]
    expect(calonUntuk('pemohon', anggota).map((a) => a.id)).toEqual(['ibu', 'kakak', 'bayi'])
    expect(calonUntuk('kelahiran', anggota).map((a) => a.id)).toEqual(['bayi'])
    expect(calonUntuk('kematian', anggota)).toEqual([])
  })
})
