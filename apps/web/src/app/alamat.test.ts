import { expect, it } from 'vitest'
import { asalDesa, DOMAIN_INDUK, keAlamat, konteksSekarang } from './alamat'

it('keAlamat memakai protokol dan port halaman ini', () => {
  expect(keAlamat({ jenis: 'desa', label: 'sungaisialang' }, '/kabar')).toBe('http://sungaisialang.sinfodes.localhost:3000/kabar')
  expect(asalDesa('tanjunglamo')).toBe('http://tanjunglamo.sinfodes.localhost:3000')
})

it('keAlamat bawaannya ke garis miring', () => expect(keAlamat({ jenis: 'induk' })).toBe('http://sinfodes.localhost:3000/'))

it('konteksSekarang membaca hostname jsdom', () => expect(konteksSekarang()).toEqual({ jenis: 'alihkan-induk' }))

it('DOMAIN_INDUK dari .env', () => expect(DOMAIN_INDUK).toBe('sinfodes.localhost'))
