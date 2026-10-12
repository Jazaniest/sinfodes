import { describe, expect, it } from 'vitest'
import { AKSEN_WEBSITE, artikelSchema, statusPengumuman, tampilanWebsiteSchema, ubahTampilanSchema, type Artikel } from './schema'

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const PNG_600KB = `data:image/png;base64,${'A'.repeat(600 * 1366)}`

describe('Website Desa (SPEC §8, §9)', () => {
  it('artikel: status Draf atau Terbit, dengan kategori dan jumlah dibaca', () => {
    const a: Artikel = {
      id: 'art_a', desaId: 'd', judul: 'Semenisasi Jalan Dusun III Capai 70 Persen', slug: 'semenisasi-jalan-dusun-iii-capai-70-persen',
      kategori: 'Pembangunan', status: 'terbit', penulis: 'Rosmiati', tanggal: '2026-09-20T10:00:00+07:00', dibaca: 412,
    }
    expect(artikelSchema.parse(a)).toEqual(a)
    expect(artikelSchema.safeParse({ ...a, status: 'arsip' }).success).toBe(false)
  })
  it('status pengumuman pada suatu tanggal', () => {
    const p = { mulai: '2026-09-20', sampai: '2026-09-30' }
    expect(statusPengumuman(p, '2026-09-19')).toBe('akan-datang')
    expect(statusPengumuman(p, '2026-09-20')).toBe('berlaku')
    expect(statusPengumuman(p, '2026-09-30')).toBe('berlaku')
    expect(statusPengumuman(p, '2026-10-01')).toBe('berakhir')
  })
  it('aksen sesuai SPEC §9, dengan Biru tinta sebagai bawaan pertama', () => {
    expect(Object.entries(AKSEN_WEBSITE).map(([id, a]) => [id, a.hex])).toEqual([
      ['biru-tinta', '#1F4E79'], ['hijau-sawit', '#2F5D3A'], ['teal-sungai', '#1E5F5A'],
      ['merah-bata', '#9A3B2A'], ['coklat-tanah', '#6B4A2E'], ['ungu-songket', '#5A3D6E'],
    ])
  })
  it('tampilan: sampul berupa unggahan atau foto kurasi; logo paling besar 500 KB (fokus review 4)', () => {
    const t = { aksen: 'hijau-sawit', motif: 'siku-keluang', sampul: '/demo/foto/sampul-sungai-kampar.jpg', logo: PNG_KECIL }
    expect(ubahTampilanSchema.parse(t)).toEqual(t)
    expect(tampilanWebsiteSchema.parse({ ...t, desaId: 'd', diperbarui: '2026-09-24T09:00:00+07:00' }).motif).toBe('siku-keluang')
    expect(ubahTampilanSchema.safeParse({ ...t, sampul: 'https://contoh.id/foto.jpg' }).error?.issues[0].message).toBe(
      'Foto sampul harus gambar PNG, JPG, WebP, atau SVG, paling besar 1500 KB.',
    )
    expect(ubahTampilanSchema.safeParse({ ...t, logo: PNG_600KB }).error?.issues[0].message).toBe('Ukuran gambar paling besar 500 KB.')
    expect(ubahTampilanSchema.safeParse({ ...t, aksen: 'jingga' }).success).toBe(false)
  })
})
