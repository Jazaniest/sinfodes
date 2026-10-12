import { describe, expect, it } from 'vitest'
import { formDariIdentitas, identitasDesaSchema, isianIdentitas, periksaIdentitas, type IdentitasDesa } from './identitas'

const IDENTITAS: IdentitasDesa = {
  nama: 'Sungai Sialang',
  kodeDesa: '14.05.09.2009',
  alamatKantor: 'Jalan Lintas Teluk Meranti Km 4, Sungai Sialang',
  kodePos: '28353',
  surel: 'pemdes@sungaisialang.desa.id',
  telepon: '081266031140',
  jamLayanan: [
    { hari: 'Senin–Kamis', buka: '08.00', tutup: '15.00' },
    { hari: 'Jumat', buka: '08.00', tutup: '11.30' },
  ],
  lambang: null,
}

describe('identitas desa (SPEC §8, §12.1)', () => {
  it('identitas demo sah; formulir dan isian API bolak-balik tanpa berubah', () => {
    expect(identitasDesaSchema.parse(IDENTITAS)).toEqual(IDENTITAS)
    const form = formDariIdentitas(IDENTITAS)
    expect(form.jamLayanan[0]).toEqual({ hari: 'Senin–Kamis', buka: '08:00', tutup: '15:00' })
    expect(isianIdentitas(form)).toEqual(IDENTITAS)
    expect(periksaIdentitas(form)).toEqual({})
  })
  it('galat per isian memakai kunci yang sama dengan `fields` dari API', () => {
    const form = {
      ...formDariIdentitas(IDENTITAS),
      kodePos: '2835',
      surel: 'pemdes@',
      jamLayanan: [{ hari: 'Jumat', buka: '11:30', tutup: '08:00' }],
    }
    expect(periksaIdentitas(form)).toEqual({
      kodePos: 'Kode pos terdiri dari 5 angka',
      surel: 'Alamat surel tidak valid',
      'jamLayanan.0.tutup': 'Jam tutup harus sesudah jam buka',
    })
  })
  it('jam layanan kosong dan lambang yang bukan gambar ditolak (fokus review 4)', () => {
    expect(periksaIdentitas({ ...formDariIdentitas(IDENTITAS), jamLayanan: [] })).toEqual({ jamLayanan: 'Isi minimal satu jam layanan' })
    expect(periksaIdentitas({ ...formDariIdentitas(IDENTITAS), lambang: 'data:text/plain;base64,QUJD' })).toEqual({
      lambang: 'Berkas harus gambar PNG, JPG, WebP, atau SVG.',
    })
  })
})
