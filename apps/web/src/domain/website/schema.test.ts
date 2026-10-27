import { describe, expect, it } from 'vitest'
import {
  artikelSchema, fotoGaleriSchema, profilDesaSchema, statusPengumuman, teksJamAgenda, umkmSchema, type Artikel,
} from './schema'

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
  it('jam agenda: rentang, atau "sampai selesai" bila jam selesai kosong', () => {
    expect(teksJamAgenda({ mulai: '09.00', selesai: '12.00' })).toBe('09.00-12.00 WIB')
    expect(teksJamAgenda({ mulai: '14.00', selesai: null })).toBe('14.00 WIB sampai selesai')
  })
  it('profil dan potensi hanya memakai foto kurasi; WhatsApp UMKM berupa nomor HP berawalan 08 (SPEC §9)', () => {
    const profil = {
      desaId: 'd', foto: '/demo/foto/kantor-desa.jpg', sejarah: ['Sejarah.'], visi: 'Visi.', misi: ['Misi.'],
      jarak: [{ ke: 'ibu kota kecamatan', tempat: 'Teluk Meranti', km: 14 }],
    }
    expect(profilDesaSchema.safeParse(profil).success).toBe(true)
    expect(profilDesaSchema.safeParse({ ...profil, foto: 'https://contoh.id/kantor.jpg' }).success).toBe(false)
    const umkm = { id: 'u', desaId: 'd', nama: 'Usaha', pemilik: 'Pemilik', produk: 'Produk', dusunId: 'dsn', whatsapp: '081234567890' }
    expect(umkmSchema.safeParse(umkm).success).toBe(true)
    expect(umkmSchema.safeParse({ ...umkm, whatsapp: '+62 812-3456-7890' }).success).toBe(false)
  })
})
