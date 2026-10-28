import { describe, expect, it } from 'vitest'
import { buatPencatat } from './log'

const tangkap = () => {
  const baris: string[] = []
  const log = buatPencatat((b) => baris.push(b), () => new Date('2026-09-24T02:00:00Z'))
  return { log, baris, json: () => baris.map((b) => JSON.parse(b) as Record<string, unknown>) }
}

describe('pencatat log', () => {
  it('kunci TOTP, rahasia, dan WhatsApp disamarkan di mana pun', () => {
    const { log, baris } = tangkap()
    log.info('masuk', { kodeTotp: '123456', totp: '654321', rahasia: 'ABCDEFG', whatsapp: '081277402231', bersarang: { totpRahasia: 'x', whatsapp_nomor: 'y' } })
    const teks = baris.join('')
    for (const bocor of ['123456', '654321', 'ABCDEFG', '081277402231']) expect(teks).not.toContain(bocor)
    expect(teks).toContain('[disamarkan]')
  })

  it('kunci tiket (akses bantuan) disamarkan di mana pun', () => {
    const { log, baris } = tangkap()
    log.info('tiket', { tiket: 'TIKET-RAHASIA-1', bersarang: { tiket: 'TIKET-RAHASIA-2' } })
    const teks = baris.join('')
    expect(teks).not.toContain('TIKET-RAHASIA')
    expect(teks).toContain('[disamarkan]')
  })

  it('galat kueri Drizzle dicatat tanpa nilai parameter, di pesan maupun tumpukan', () => {
    const { log, baris } = tangkap()
    const galat = new Error('Failed query: select "id" from "pengguna" where "email" = $1\nparams: rahasia@contoh.id,sandi-bocor')
    galat.name = 'DrizzleQueryError'
    log.galat('permintaan.gagal', { galat })
    const teks = baris.join('')
    expect(teks).toContain('Failed query')
    expect(teks).not.toContain('rahasia@contoh.id')
    expect(teks).not.toContain('sandi-bocor')
  })

  it('satu baris JSON per peristiwa dengan tingkat, waktu, dan peristiwa', () => {
    const { log, baris, json } = tangkap()
    log.info('server.mulai', { port: 3001 })
    log.peringatan('batas.laju', { alamat: 'x' })
    log.galat('permintaan.gagal', { idPermintaan: 'abc' })
    expect(baris).toHaveLength(3)
    expect(baris.every((b) => !b.includes('\n'))).toBe(true)
    expect(json().map((j) => j.tingkat)).toEqual(['info', 'peringatan', 'galat'])
    expect(json()[0]).toMatchObject({ waktu: '2026-09-24T02:00:00.000Z', peristiwa: 'server.mulai', port: 3001 })
  })

  it('kunci terlarang disamarkan di mana pun, termasuk objek dan larik bersarang', () => {
    const { log, baris } = tangkap()
    log.info('masuk', {
      nik: '1405095203918002',
      nomorKk: '1405090101120001',
      pin: '123456',
      kataSandi: 'demo',
      passphrase: 'sialang2026',
      token: 'abc',
      telepon: '081277402231',
      cookie: '__Host-panel=rahasia',
      authorization: 'Bearer abc',
      'set-cookie': '__Host-panel=rahasia',
      dalam: { NIK: '1405095203918002', Kata_Sandi: 'x', aman: 'terlihat' },
      daftar: [{ pin: '999999' }, { nama: 'Siti' }],
    })
    const teks = baris.join('\n')
    for (const rahasia of ['1405095203918002', '1405090101120001', '123456', 'sialang2026', '081277402231', 'Bearer abc', '__Host-panel=rahasia', '999999']) {
      expect(teks).not.toContain(rahasia)
    }
    expect(teks).toContain('terlihat')
    expect(teks).toContain('Siti')
    expect(teks).toContain('[disamarkan]')
  })

  it('Error dicatat dengan nama, pesan, dan tumpukan di log (bukan untuk klien)', () => {
    const { log, json } = tangkap()
    log.galat('tak-terduga', { galat: new Error('gagal baca') })
    const g = json()[0].galat as Record<string, unknown>
    expect(g.nama).toBe('Error')
    expect(g.pesan).toBe('gagal baca')
    expect(typeof g.tumpukan).toBe('string')
  })

  it('referensi melingkar tidak membuat pencatat melempar', () => {
    const { log, baris } = tangkap()
    const a: Record<string, unknown> = { nama: 'a' }
    a.diri = a
    expect(() => log.info('melingkar', a)).not.toThrow()
    expect(baris).toHaveLength(1)
  })
})
