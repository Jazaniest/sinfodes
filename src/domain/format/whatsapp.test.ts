import { describe, expect, it } from 'vitest'
import { tautanWhatsapp } from './whatsapp'

describe('tautan WhatsApp (SPEC §9)', () => {
  it('nomor 08… atau +62… menjadi wa.me/62…', () => {
    expect(tautanWhatsapp('081266031140')).toBe('https://wa.me/6281266031140')
    expect(tautanWhatsapp('+62 812-6603-1140')).toBe('https://wa.me/6281266031140')
  })
  it('pesan pembuka dikodekan', () => {
    expect(tautanWhatsapp('081266031140', 'Halo, saya mau pesan ikan salai')).toBe(
      'https://wa.me/6281266031140?text=Halo%2C%20saya%20mau%20pesan%20ikan%20salai',
    )
  })
})
