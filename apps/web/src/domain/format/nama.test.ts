import { describe, expect, it } from 'vitest'
import { inisialNama, namaUntukSurat, samarkanNama } from './nama'

describe('nama', () => {
  it('KAPITAL untuk kolom data surat', () => expect(namaUntukSurat(' Siti Rahmah ')).toBe('SITI RAHMAH'))
  it('disamarkan untuk verifikasi publik', () => expect(samarkanNama('Siti Rahmah')).toBe('S*** R*****'))
  it('inisial dua huruf pertama', () => {
    expect(inisialNama('Siti Rahmah')).toBe('SR')
    expect(inisialNama('Zulkifli')).toBe('Z')
  })
})
