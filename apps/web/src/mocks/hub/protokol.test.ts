import { expect, it } from 'vitest'
import { adalahPesanDariHub, adalahPesanKeHub, asalHubSah } from './protokol'

it.each([
  ['http://sungaisialang.sinfodes.localhost:5173', true],
  ['http://sinfodes.localhost:5173', true],
  ['https://konsol.sinfodes.localhost', true],
  ['http://sinfodes.localhost.jahat.com', false],
  ['http://jahatsinfodes.localhost', false],
  ['null', false],
  ['javascript:alert(1)', false],
])('asalHubSah(%s) = %s', (asal, sah) => expect(asalHubSah(asal, 'sinfodes.localhost')).toBe(sah))

it('pesan ke hub dikenali dari bentuknya', () => {
  expect(adalahPesanKeHub({ sinfodesHub: 1, id: 1, op: 'baca', kunci: 'x' })).toBe(true)
  expect(adalahPesanKeHub({ sinfodesHub: 1, id: 1, op: 'hapus-semua', kunci: 'x' })).toBe(false)
  expect(adalahPesanKeHub({ id: 1, op: 'baca', kunci: 'x' })).toBe(false)
  expect(adalahPesanKeHub('baca')).toBe(false)
})

it('pesan dari hub dikenali dari bentuknya', () => {
  expect(adalahPesanDariHub({ sinfodesHub: 1, jenis: 'siap' })).toBe(true)
  expect(adalahPesanDariHub({ sinfodesHub: 1, jenis: 'balasan', id: 2 })).toBe(true)
  expect(adalahPesanDariHub({ sinfodesHub: 1, jenis: 'berubah', kunci: 'k' })).toBe(true)
  expect(adalahPesanDariHub({ sinfodesHub: 1, jenis: 'lain' })).toBe(false)
  expect(adalahPesanDariHub(null)).toBe(false)
})
