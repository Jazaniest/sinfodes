import { describe, expect, it } from 'vitest'
import { alamatLuar, bacaAlamat, labelAlamatSah, labelKabupaten, normalkanNama, usulanAlamatDesa } from './alamat'

const I = 'sinfodes.localhost'

describe('bacaAlamat (SPEC-V0.2 §4.1)', () => {
  it.each([
    ['sinfodes.localhost', { jenis: 'induk' }],
    ['www.sinfodes.localhost', { jenis: 'alihkan-induk' }],
    ['localhost', { jenis: 'alihkan-induk' }],
    ['konsol.sinfodes.localhost', { jenis: 'konsol' }],
    ['kab-pelalawan.sinfodes.localhost', { jenis: 'kabupaten', label: 'kab-pelalawan' }],
    ['kota-dumai.sinfodes.localhost', { jenis: 'kabupaten', label: 'kota-dumai' }],
    ['sungaisialang.sinfodes.localhost', { jenis: 'desa', label: 'sungaisialang' }],
    ['Sungaisialang.SINFODES.localhost', { jenis: 'desa', label: 'sungaisialang' }],
    ['sungai-sialang.sinfodes.localhost', { jenis: 'desa', label: 'sungai-sialang' }],
    ['api.sinfodes.localhost', { jenis: 'terlarang', label: 'api' }],
    ['a.b.sinfodes.localhost', { jenis: 'terlarang', label: 'a.b' }],
    ['xn--abc.sinfodes.localhost', { jenis: 'terlarang', label: 'xn--abc' }],
    ['-abc.sinfodes.localhost', { jenis: 'terlarang', label: '-abc' }],
    ['127.0.0.1', { jenis: 'luar' }],
    ['contoh.com', { jenis: 'luar' }],
  ])('%s', (host, hasil) => expect(bacaAlamat(host, I)).toEqual(hasil))

  it('localhost polos hanya dialihkan bila induknya di bawah .localhost', () => {
    expect(bacaAlamat('localhost', 'sinfodes.com')).toEqual({ jenis: 'luar' })
  })

  it('bekerja untuk induk bertingkat', () => {
    expect(bacaAlamat('sungaisialang.demo.sinfodes.com', 'demo.sinfodes.com')).toEqual({ jenis: 'desa', label: 'sungaisialang' })
  })
})

it.each([
  ['sungaisialang', true],
  ['sungaisialang-pelalawan', true],
  ['ab', false],
  ['a'.repeat(41), false],
  ['konsol', false],
  ['kab-pelalawan', false],
  ['kota-dumai', false],
  ['xn--abc', false],
  ['sungai--sialang', false],
  ['-abc', false],
  ['abc-', false],
  ['Abc', false],
])('labelAlamatSah(%s) = %s', (label, sah) => expect(labelAlamatSah(label)).toBe(sah))

it('normalkanNama: huruf kecil tanpa spasi dan tanda baca', () => {
  expect(normalkanNama('Sungai Sialang')).toBe('sungaisialang')
  expect(normalkanNama('Ukui II')).toBe('ukuiii')
  expect(normalkanNama('Teluk Meranti')).toBe('telukmeranti')
})

it('labelKabupaten: kab- atau kota-', () => {
  expect(labelKabupaten('Pelalawan')).toBe('kab-pelalawan')
  expect(labelKabupaten('Kabupaten Indragiri Hilir')).toBe('kab-indragirihilir')
  expect(labelKabupaten('Kota Dumai')).toBe('kota-dumai')
})

describe('usulanAlamatDesa (SPEC-V0.2 §4.2)', () => {
  const w = { nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan' }

  it('urut: nama, +kabupaten, +kecamatan, +kecamatan+kabupaten', () => {
    expect(usulanAlamatDesa(w, new Set())).toBe('sungaisialang')
    expect(usulanAlamatDesa(w, new Set(['sungaisialang']))).toBe('sungaisialang-pelalawan')
    expect(usulanAlamatDesa(w, new Set(['sungaisialang', 'sungaisialang-pelalawan']))).toBe('sungaisialang-telukmeranti')
    expect(usulanAlamatDesa(w, new Set(['sungaisialang', 'sungaisialang-pelalawan', 'sungaisialang-telukmeranti']))).toBe(
      'sungaisialang-telukmeranti-pelalawan',
    )
  })

  it('null bila semua terpakai', () => {
    const semua = new Set(['sungaisialang', 'sungaisialang-pelalawan', 'sungaisialang-telukmeranti', 'sungaisialang-telukmeranti-pelalawan'])
    expect(usulanAlamatDesa(w, semua)).toBeNull()
  })

  it('melewati nama terlarang', () => expect(usulanAlamatDesa({ ...w, nama: 'Konsol' }, new Set())).toBe('konsol-pelalawan'))
})

describe('alamatLuar', () => {
  const asal = { domainInduk: I, protokol: 'http:', port: '5173' }

  it('desa dengan query dan hash', () =>
    expect(alamatLuar({ jenis: 'desa', label: 'sungaisialang' }, '/verifikasi?kode=SS-7K3M-Q9TD#hasil', asal)).toBe(
      'http://sungaisialang.sinfodes.localhost:5173/verifikasi?kode=SS-7K3M-Q9TD#hasil',
    ))

  it('induk tanpa port', () =>
    expect(alamatLuar({ jenis: 'induk' }, '/', { domainInduk: 'sinfodes.com', protokol: 'https:', port: '' })).toBe('https://sinfodes.com/'))

  it('jalur kosong memberi asal saja', () => expect(alamatLuar({ jenis: 'konsol' }, '', asal)).toBe('http://konsol.sinfodes.localhost:5173'))

  it('kabupaten', () =>
    expect(alamatLuar({ jenis: 'kabupaten', label: 'kab-pelalawan' }, '/admin', asal)).toBe(
      'http://kab-pelalawan.sinfodes.localhost:5173/admin',
    ))
})
