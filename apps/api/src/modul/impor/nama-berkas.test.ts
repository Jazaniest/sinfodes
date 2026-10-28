import { describe, expect, it } from 'vitest'
import { bersihkanNamaBerkas } from './nama-berkas'

describe('bersihkanNamaBerkas (rencana 8E3 Ruling 9)', () => {
  it('nama biasa tidak berubah', () => {
    expect(bersihkanNamaBerkas('pendataan-rt-teluk-rengas.xlsx')).toBe('pendataan-rt-teluk-rengas.xlsx')
  })

  it('jalur dibuang, hanya nama dasar yang dipakai', () => {
    expect(bersihkanNamaBerkas('../../etc/data.csv')).toBe('data.csv')
    expect(bersihkanNamaBerkas('C:\\Users\\Rosmiati\\Desktop\\data penduduk.xlsx')).toBe('data penduduk.xlsx')
  })

  it('karakter kontrol dan pengecoh arah tulisan dibuang', () => {
    expect(bersihkanNamaBerkas('a\u0000b\u001f.xlsx')).toBe('ab.xlsx')
    expect(bersihkanNamaBerkas('laporan\u202Evsxlx.csv')).toBe('laporanvsxlx.csv')
    expect(bersihkanNamaBerkas('baris\nbaru.csv')).toBe('barisbaru.csv')
  })

  it('lebih dari 120 karakter dipotong dengan ekstensi tetap', () => {
    const nama = bersihkanNamaBerkas(`${'a'.repeat(300)}.xlsx`)
    expect(nama).toHaveLength(120)
    expect(nama.endsWith('.xlsx')).toBe(true)
  })

  it('nama yang habis dibersihkan diganti nama bawaan', () => {
    expect(bersihkanNamaBerkas('')).toBe('berkas')
    expect(bersihkanNamaBerkas('\u0000\u0001')).toBe('berkas')
    expect(bersihkanNamaBerkas('/')).toBe('berkas')
  })
})
