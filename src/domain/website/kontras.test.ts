import { describe, expect, it } from 'vitest'
import { dariOklch, formatRasio, gelapkanSampaiLolos, keOklch, luminans, periksaTema, rasioKontras } from './kontras'
import { PRESET_WARNA } from './tema'

const selisihKanal = (a: string, b: string) => Math.max(...[1, 3, 5].map((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16))))
const HEX_SAH = /^#[0-9A-F]{6}$/

describe('pemeriksa kontras (rencana 7E-1 Tugas 1)', () => {
  it('rasio WCAG: hitam-putih 21, sama 1, #767676 di atas putih sekitar 4,54', () => {
    expect(rasioKontras('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(rasioKontras('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
    expect(rasioKontras('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2)
    expect(luminans('#FFFFFF')).toBeCloseTo(1, 5)
  })
  it('batas 4,5: 4,49 ditolak (tampil 4,4), 4,50 diterima (fokus review 1)', () => {
    const di49 = periksaTema({ warnaUtama: '#767777', warnaAksen: '#1F4E79', latar: 'putih' }).find((p) => p.kunci === 'putih-utama')!
    expect(di49.rasio).toBeLessThan(4.5)
    expect(di49.lolos).toBe(false)
    expect(formatRasio(di49.rasio)).toBe('4,4')
    expect(di49.pesan).toBe('Kontras teks putih di atas warna utama 4,4 : 1; perlu paling sedikit 4,5 : 1.')
    const di50 = periksaTema({ warnaUtama: '#757778', warnaAksen: '#1F4E79', latar: 'putih' }).find((p) => p.kunci === 'putih-utama')!
    expect(di50.lolos).toBe(true)
    expect(di50.pesan).toBeNull()
    expect(formatRasio(di50.rasio)).toBe('4,5')
  })
  it('formatRasio: satu desimal berkoma, dibulatkan ke bawah', () => {
    expect(formatRasio(21)).toBe('21,0')
    expect(formatRasio(1.3015)).toBe('1,3')
    expect(formatRasio(4.5)).toBe('4,5')
    expect(formatRasio(4.4999999999)).toBe('4,4')
  })
  it('#FFD400 di latar kertas: pesan utama-latar persis, dan teks putih juga gagal', () => {
    const hasil = periksaTema({ warnaUtama: '#FFD400', warnaAksen: '#1F4E79', latar: 'kertas' })
    expect(hasil.map((p) => p.kunci)).toEqual(['utama-latar', 'putih-utama', 'aksen-latar'])
    expect(hasil[0]).toMatchObject({ lolos: false, minimum: 4.5, pesan: 'Kontras warna utama di atas latar 1,3 : 1; perlu paling sedikit 4,5 : 1.' })
    expect(hasil[1].lolos).toBe(false)
    expect(hasil[2]).toMatchObject({ lolos: true, minimum: 3, pesan: null })
  })
  it('aksen terang ditolak dengan pesan aksen-latar (minimum 3)', () => {
    const p = periksaTema({ warnaUtama: '#1F4E79', warnaAksen: '#F5F5F5', latar: 'putih' }).find((x) => x.kunci === 'aksen-latar')!
    expect(p.lolos).toBe(false)
    expect(p.pesan).toBe('Kontras warna aksen di atas latar 1,0 : 1; perlu paling sedikit 3 : 1.')
  })
  it('gelapkanSampaiLolos: #FFFF00 berhenti di hasil yang lolos dan tetap hex sah (fokus review 1)', () => {
    const lolos = (h: string) => rasioKontras(h, '#FFFFFF') >= 4.5 && rasioKontras(h, '#F6F4EE') >= 4.5
    const hasil = gelapkanSampaiLolos('#FFFF00', lolos)
    expect(hasil).toMatch(HEX_SAH)
    expect(lolos(hasil)).toBe(true)
    expect(hasil).not.toBe('#FFFF00')
  })
  it('gelapkanSampaiLolos: warna yang sudah lolos dikembalikan tetap', () => {
    expect(gelapkanSampaiLolos('#1F4E79', (h) => rasioKontras(h, '#FFFFFF') >= 4.5)).toBe('#1F4E79')
  })
  it('gelapkanSampaiLolos: berhenti walau tidak ada warna yang lolos', () => {
    expect(gelapkanSampaiLolos('#FFFF00', () => false)).toMatch(HEX_SAH)
  })
  it('OKLCH pulang-pergi mengembalikan preset (selisih paling banyak 1 per kanal)', () => {
    for (const { hex } of PRESET_WARNA.slice(0, 5)) {
      const { l, c, h } = keOklch(hex)
      expect(selisihKanal(dariOklch(l, c, h), hex)).toBeLessThanOrEqual(1)
    }
  })
  it('OKLCH: hitam L=0, putih L=1', () => {
    expect(keOklch('#000000').l).toBeCloseTo(0, 3)
    expect(keOklch('#FFFFFF').l).toBeCloseTo(1, 3)
  })
})
