import { describe, expect, it } from 'vitest'
import { CSP_BINGKAI, srcdocBingkai, tinggiDariPesan } from './bingkai-html'

const ASAL_MEDIA = 'https://desa.sinfodes.id/demo/foto/'

/** Skrip tinggi otomatis yang harus tetap utuh setelah kode desa (keputusan 5). */
const SKRIP_TINGGI =
  "new ResizeObserver(function(){parent.postMessage({tipe:'sinfodes-tinggi',tinggi:document.documentElement.scrollHeight},'*')}).observe(document.documentElement)"

describe('CSP_BINGKAI (7G keputusan 5)', () => {
  it('persis: tanpa sumber bawaan, img data dan foto demo, gaya serta skrip inline, font data', () => {
    expect(CSP_BINGKAI(ASAL_MEDIA)).toBe(
      "default-src 'none'; img-src data: https://desa.sinfodes.id/demo/foto/; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:",
    )
  })
})

describe('srcdocBingkai (7G keputusan 5)', () => {
  it('diawali doctype dan CSP sebelum kode desa', () => {
    const doc = srcdocBingkai({ kode: '<h1>Judul</h1>', variabelTema: {}, otomatis: false, asalMedia: ASAL_MEDIA })
    expect(doc.startsWith('<!doctype html><meta charset="utf-8">')).toBe(true)
    expect(doc.indexOf('Content-Security-Policy')).toBeLessThan(doc.indexOf('<h1>Judul</h1>'))
    expect(doc.indexOf('<meta name="viewport" content="width=device-width, initial-scale=1">')).toBeLessThan(
      doc.indexOf('<h1>Judul</h1>'),
    )
  })

  it('menulis variabel kontrak tema pada :root dan menyaring nilai ke karakter aman', () => {
    const doc = srcdocBingkai({
      kode: '',
      variabelTema: { '--desa-warna-utama': '#1F4E79', '--desa-sudut': '8px', '--desa-bahaya': 'a;b{c}d<e>' },
      otomatis: false,
      asalMedia: ASAL_MEDIA,
    })
    expect(doc).toContain('<style>:root{--desa-warna-utama:#1F4E79;--desa-sudut:8px;--desa-bahaya:abcde}</style>')
    expect(doc).not.toContain('a;b{c}d<e>')
  })

  it('tanpa tinggi otomatis tidak ada skrip dan kode desa tetap terakhir', () => {
    const kode = '<h1>Judul</h1>'
    const doc = srcdocBingkai({ kode, variabelTema: {}, otomatis: false, asalMedia: ASAL_MEDIA })
    expect(doc.endsWith(kode)).toBe(true)
    expect(doc).not.toContain('<script>')
  })

  it('tinggi otomatis menaruh skrip tetap setelah kode; kode berisi </script><script> tidak merusaknya', () => {
    const kode = 'awal</script><script>alert(1)'
    const doc = srcdocBingkai({ kode, variabelTema: {}, otomatis: true, asalMedia: ASAL_MEDIA })
    expect(doc).toContain(kode)
    expect(doc.endsWith(`<script>${SKRIP_TINGGI}</script>`)).toBe(true)
    expect(doc.split(SKRIP_TINGGI)).toHaveLength(2)
  })
})

describe('tinggiDariPesan (7G keputusan 7, Review Focus 4)', () => {
  it('angka hingga diterima dan dipotong ke 40-3000 px', () => {
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: 640 })).toBe(640)
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: 40 })).toBe(40)
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: -5 })).toBe(40)
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: 5000 })).toBe(3000)
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: 1e9 })).toBe(3000)
  })

  it('pesan lain, NaN, Infinity, dan string diabaikan tanpa galat', () => {
    expect(tinggiDariPesan(null)).toBeNull()
    expect(tinggiDariPesan('sinfodes-tinggi')).toBeNull()
    expect(tinggiDariPesan(640)).toBeNull()
    expect(tinggiDariPesan({ tipe: 'lain', tinggi: 640 })).toBeNull()
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi' })).toBeNull()
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: NaN })).toBeNull()
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: Infinity })).toBeNull()
    expect(tinggiDariPesan({ tipe: 'sinfodes-tinggi', tinggi: '640' })).toBeNull()
  })
})
