import { describe, expect, it } from 'vitest'
import {
  AKSEN_WEBSITE, artikelSchema, fotoGaleriSchema, statusPengumuman, tampilanWebsiteSchema, teksJamAgenda, ubahTampilanSchema,
  type Artikel,
} from './schema'

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const PNG_600KB = `data:image/png;base64,${'A'.repeat(600 * 1366)}`

describe('Website Desa (SPEC §8, §9)', () => {
  it('artikel: status Draf atau Terbit, dengan kategori, jumlah dibaca, ringkasan, isi berparagraf, dan foto kurasi', () => {
    const a: Artikel = {
      id: 'art_a', desaId: 'd', judul: 'Semenisasi Jalan Dusun III Capai 70 Persen', slug: 'semenisasi-jalan-dusun-iii-capai-70-persen',
      kategori: 'Pembangunan', status: 'terbit', penulis: 'Rosmiati', tanggal: '2026-09-20T10:00:00+07:00', dibaca: 412,
      ringkasan: 'Semenisasi sudah mencapai 70 persen.', isi: ['Paragraf pertama.', 'Paragraf kedua.'], foto: '/demo/foto/semenisasi-50.jpg',
    }
    expect(artikelSchema.parse(a)).toEqual(a)
    expect(artikelSchema.safeParse({ ...a, status: 'arsip' }).success).toBe(false)
    expect(artikelSchema.safeParse({ ...a, isi: [] }).success).toBe(false)
    expect(artikelSchema.safeParse({ ...a, foto: 'https://contoh.id/foto.jpg' }).success).toBe(false)
    expect(artikelSchema.parse({ ...a, foto: null }).foto).toBeNull()
  })
  it('foto galeri: kredit berisi judul asli, sumber, pembuat, dan lisensi bertaut (SPEC §9, K8)', () => {
    const f = {
      id: 'fto_a', desaId: 'd', judul: 'Ombak Bono di Teluk Meranti', album: 'Potensi desa', berkas: '/demo/foto/ombak-bono.jpg', tersedia: true,
      kredit: {
        judulAsli: 'Bekudo Bono.jpg', sumber: 'https://commons.wikimedia.org/wiki/File:Bekudo_Bono.jpg', pembuat: 'Domiyanto1977',
        lisensi: 'CC BY-SA 4.0', tautanLisensi: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
    }
    expect(fotoGaleriSchema.parse(f)).toEqual(f)
    expect(fotoGaleriSchema.safeParse({ ...f, kredit: { ...f.kredit, sumber: 'bukan tautan' } }).success).toBe(false)
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
  it('jam agenda: rentang, atau "sampai selesai" bila jam selesai kosong', () => {
    expect(teksJamAgenda({ mulai: '09.00', selesai: '12.00' })).toBe('09.00–12.00 WIB')
    expect(teksJamAgenda({ mulai: '14.00', selesai: null })).toBe('14.00 WIB sampai selesai')
  })
})
