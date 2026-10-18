import { expect, it } from 'vitest'
import { KONTAK_SINFODES, tautanDaftarDesa } from './kontak-sinfodes'

it('Daftarkan desa membuka WhatsApp Tim Sinfodes dengan pesan pembuka', () => {
  expect(KONTAK_SINFODES).toEqual({ whatsapp: '6280000000000', email: 'daftar@sinfodes.example' })
  expect(tautanDaftarDesa()).toBe(
    `https://wa.me/6280000000000?text=${encodeURIComponent('Halo Tim Sinfodes, kami ingin mendaftarkan desa kami.')}`,
  )
})
