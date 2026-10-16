import { expect, it } from 'vitest'
import { hrefPublik, keluarkanJalur, masukkanJalur, rewriteAlamat } from './rewrite-alamat'

const desa = { jenis: 'desa', label: 'sungaisialang' } as const

it.each([
  ['/', '/desa/sungaisialang'],
  ['/kabar/judul', '/desa/sungaisialang/kabar/judul'],
  ['/admin', '/admin'],
  ['/admin/surat', '/admin/surat'],
  ['/administrasi', '/desa/sungaisialang/administrasi'],
  ['/warga/riwayat', '/warga/riwayat'],
  ['/wargaku', '/desa/sungaisialang/wargaku'],
  ['/desa/sungaisialang/kabar', '/desa/sungaisialang/kabar'],
])('desa: masuk %s → %s', (luar, dalam) => expect(masukkanJalur(desa, luar)).toBe(dalam))

it.each([
  ['/desa/sungaisialang', '/'],
  ['/desa/sungaisialang/kabar', '/kabar'],
  ['/admin/surat', '/admin/surat'],
  ['/', '/'],
])('desa: keluar %s → %s', (dalam, luar) => expect(keluarkanJalur(desa, dalam)).toBe(luar))

it('konsol', () => {
  const k = { jenis: 'konsol' } as const
  expect(masukkanJalur(k, '/')).toBe('/konsol')
  expect(masukkanJalur(k, '/desa/x')).toBe('/konsol/desa/x')
  expect(masukkanJalur(k, '/konsol/desa')).toBe('/konsol/desa')
  expect(masukkanJalur(k, '/konsolidasi')).toBe('/konsol/konsolidasi')
  expect(keluarkanJalur(k, '/konsol')).toBe('/')
  expect(keluarkanJalur(k, '/konsol/desa/x')).toBe('/desa/x')
})

it('kabupaten', () => {
  const k = { jenis: 'kabupaten', label: 'kab-pelalawan' } as const
  expect(masukkanJalur(k, '/admin')).toBe('/kabupaten/admin')
  expect(keluarkanJalur(k, '/kabupaten/admin')).toBe('/admin')
})

it('induk menutup jalur milik alamat lain', () => {
  const k = { jenis: 'induk' } as const
  expect(masukkanJalur(k, '/admin/surat')).toBe('/panel-pindah')
  expect(masukkanJalur(k, '/warga')).toBe('/panel-pindah')
  expect(masukkanJalur(k, '/desa/sungaisialang')).toBe('/tidak-ada')
  expect(masukkanJalur(k, '/kabupaten')).toBe('/tidak-ada')
  expect(masukkanJalur(k, '/katalog')).toBe('/katalog')
})

it('terlarang', () => expect(masukkanJalur({ jenis: 'terlarang', label: 'api' }, '/apa')).toBe('/alamat-tidak-dikenal'))

it('luar tanpa rewrite', () => expect(rewriteAlamat({ jenis: 'luar' })).toBeUndefined())

it('hrefPublik menjaga query dan hash', () =>
  expect(hrefPublik(desa, '/desa/sungaisialang/kabar?kategori=umum#atas')).toBe('/kabar?kategori=umum#atas'))
