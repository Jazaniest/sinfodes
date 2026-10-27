import { describe, expect, it } from 'vitest'
import { barisTemplate, cocokkanKolom, FIELD_IMPOR, LABEL_FIELD_IMPOR, periksaPemetaan } from './kolom'

describe('cocokkan kolom impor (SPEC §6.8)', () => {
  it.each([
    ['NIK', 'nik'], ['Nama Lengkap', 'nama'], ['L/P', 'jenisKelamin'], ['Tgl. Lahir', 'tanggalLahir'],
    ['SHDK', 'hubunganKeluarga'], ['No. KK', 'nomorKk'], ['Status Kawin', 'statusPerkawinan'], ['  RT ', 'rt'],
  ])('“%s” → %s', (judul, field) => expect(cocokkanKolom(judul)).toBe(field))
  it('kolom yang tidak dikenali → null', () => {
    expect(cocokkanKolom('Gol. Drh')).toBeNull()
    expect(cocokkanKolom('Keterangan')).toBeNull()
  })
  it('pemetaan: kolom wajib yang kurang dan field yang dipakai dua kali', () => {
    const { kurang, ganda } = periksaPemetaan(['nama', 'nama', 'nik'])
    expect(ganda).toEqual(['nama'])
    expect(kurang).toContain('tanggalLahir')
    expect(kurang).not.toContain('nik')
  })
  it('template: satu baris kepala kolom berlabel', () =>
    expect(barisTemplate()).toEqual([FIELD_IMPOR.map((f) => LABEL_FIELD_IMPOR[f])]))
})
