import { describe, expect, it } from 'vitest'
import { GALERI_TEMA, pasangTema, samaDenganGaleri, temaGaleri } from './galeri-tema'
import { periksaTema } from './kontras'
import { temaDasarSchema, TEMA_WARTA_BAWAAN } from './tema'

describe('Galeri tema (rencana 7E-2 Tugas 1)', () => {
  it('delapan tema dengan id unik; Warta pertama dan menjadi bawaan v0.1', () => {
    expect(GALERI_TEMA).toHaveLength(8)
    expect(new Set(GALERI_TEMA.map((t) => t.id)).size).toBe(8)
    expect(GALERI_TEMA[0].id).toBe('warta')
    expect(GALERI_TEMA.map((t) => t.id)).toEqual(['warta', 'balai', 'pesisir', 'serambi', 'ladang', 'tenun', 'rimba', 'bandar'])
    expect(GALERI_TEMA[0].dasar).toMatchObject({ huruf: 'plex', latar: 'kertas', sudut: 'tajam', kepadatan: 'lega', kepala: 'warta', foto: 'bingkai', motif: 'pucuk-rebung' })
  })
  it('setiap tema punya nama, satu kalimat keterangan, dan susunan beranda null', () => {
    for (const t of GALERI_TEMA) {
      expect(t.nama.length, t.id).toBeGreaterThan(2)
      expect(t.keterangan.endsWith('.'), t.id).toBe(true)
      expect(t.susunanBeranda, t.id).toBeNull()
    }
    expect(temaGaleri('warta').keterangan).toBe('Tampilan warta desa seperti v0.1: kepala bertanggal dan foto berbingkai.')
  })
  it('setiap tema lolos pemeriksa kontras di latarnya sendiri dan lolos skema tema', () => {
    for (const t of GALERI_TEMA) {
      expect(periksaTema(t.dasar).filter((p) => !p.lolos), t.id).toEqual([])
      const sah = temaDasarSchema.safeParse({ ...t.dasar, logo: null, sampul: null, warga: { fotoLatar: null, sambutan: null }, idGaleri: t.id })
      expect(sah.success, t.id).toBe(true)
    }
  })
  it('setiap tema punya gambar pratinjau sendiri: string tidak kosong, delapan nilai berbeda (Tugas 3)', () => {
    for (const t of GALERI_TEMA) expect(t.pratinjau.length, t.id).toBeGreaterThan(0)
    expect(new Set(GALERI_TEMA.map((t) => t.pratinjau)).size).toBe(8)
  })
  it('tidak ada dua tema dengan kombinasi huruf, kepala, foto, dan kepadatan yang sama', () => {
    const kunci = GALERI_TEMA.map((t) => [t.dasar.huruf, t.dasar.kepala, t.dasar.foto, t.dasar.kepadatan].join('|'))
    expect(new Set(kunci).size).toBe(8)
  })
  it('pasangTema mengganti pengaturan tampilan tetapi mempertahankan logo, sampul, dan halaman masuk warga', () => {
    const logo = `data:image/png;base64,${'A'.repeat(64)}`
    const asal = { ...TEMA_WARTA_BAWAAN('#1F4E79'), logo, warga: { fotoLatar: null, sambutan: 'Selamat datang.' } }
    const baru = pasangTema(asal, 'pesisir')
    expect(baru).toMatchObject({ huruf: 'literata', kepala: 'pita', foto: 'penuh', idGaleri: 'pesisir', logo, warga: { sambutan: 'Selamat datang.' } })
    expect(baru.warnaUtama).toBe(temaGaleri('pesisir').dasar.warnaUtama)
  })
  it('samaDenganGaleri mengenali tema terpasang, dan null setelah satu pengaturan diubah', () => {
    const terpasang = pasangTema(TEMA_WARTA_BAWAAN('#1F4E79'), 'tenun')
    expect(samaDenganGaleri(terpasang)).toBe('tenun')
    expect(samaDenganGaleri({ ...terpasang, sudut: 'bulat' })).toBeNull()
    expect(samaDenganGaleri({ ...terpasang, logo: `data:image/png;base64,${'A'.repeat(64)}` })).toBe('tenun')
  })
})
