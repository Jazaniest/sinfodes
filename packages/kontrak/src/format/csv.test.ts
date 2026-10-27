import { describe, expect, it } from 'vitest'
import { BOM, keCsv } from './csv'

describe('keCsv (SPEC §6.2, fokus review 4)', () => {
  it('titik koma, BOM UTF-8, dan akhir baris CRLF', () => {
    expect(keCsv([['Nama', 'Jiwa'], ['Dusun I', 812]])).toBe(`${BOM}Nama;Jiwa\r\nDusun I;812\r\n`)
  })
  it('isian berisi titik koma, petik, atau baris baru diberi petik', () => {
    expect(keCsv([['RT 004; RW 002', 'kata "baik"', 'baris\nkedua']])).toBe(
      `${BOM}"RT 004; RW 002";"kata ""baik""";"baris\nkedua"\r\n`,
    )
  })
  it('angka panjang dan angka berawalan nol tetap teks di Excel', () => {
    expect(keCsv([['1405095203918002', '004', '081277402231', '2812']])).toBe(
      `${BOM}="1405095203918002";="004";="081277402231";2812\r\n`,
    )
  })
  it('isian berawalan = + - @ tidak dibaca sebagai rumus', () => {
    expect(keCsv([['=SUM(A1)', '+62', '-5', '@kepala']])).toBe(`${BOM}'=SUM(A1);'+62;'-5;'@kepala\r\n`)
  })
  it('null menjadi sel kosong', () => expect(keCsv([['a', null, 'b']])).toBe(`${BOM}a;;b\r\n`))
})
