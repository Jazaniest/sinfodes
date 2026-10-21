import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilBerandaPublik, ambilHalamanTambahan, ambilIdentitasPublik } from '@/api/publik'
import { ambilStatistikPublik } from '@/api/publik-halaman'
import { simpanDraf, terbitkan } from '@/api/website'
import { susunBlok } from '@/domain/website/blok'
import { menuBawaan, susunanBawaan, type ItemMenu } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import type { BlokTampil } from '@/domain/publik/schema'
import { ID_SUNGAI_SIALANG } from '@/mocks/data/desa-demo'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TEMA = TEMA_WARTA_BAWAAN('#1F4E79')
const SUSUNAN_WARTA = ['lencana', 'kabar', 'layanan', 'kabar', 'pengumuman-agenda', 'angka', 'apbdes', 'potensi']

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const kabarSaja = (b: BlokTampil): b is Extract<BlokTampil, { jenis: 'kabar' }> => b.jenis === 'kabar'

describe('Blok publik, halaman tambahan, dan menu (rencana 7F-1 Tugas 3)', () => {
  it('beranda Sungai Sialang: urutan jenis blok sama dengan susunan Warta, tanpa blok yang kosong', async () => {
    const hasil = await ambilBerandaPublik('sungaisialang')
    expect(hasil.blok.map((b) => b.jenis)).toEqual(SUSUNAN_WARTA)
    expect(hasil.blok.map((b) => `${b.jenis}:${b.varian}:${b.lebar}`)).toEqual([
      'lencana:deret:penuh', 'kabar:sorotan:penuh', 'layanan:kisi:penuh', 'kabar:daftar:lebar',
      'pengumuman-agenda:bertumpuk:sempit', 'angka:kalimat:penuh', 'apbdes:batang:penuh', 'potensi:kartu:penuh',
    ])
  })
  it('dua blok kabar berturut-turut memuat artikel berbeda; cakupan daftar 5 artikel terbaru termasuk yang jadi sorotan', async () => {
    const hasil = await ambilBerandaPublik('sungaisialang')
    const [sorotan, daftar] = hasil.blok.filter(kabarSaja)
    expect(sorotan.data.artikel).toHaveLength(1)
    expect(sorotan.data.artikel[0].foto).not.toBeNull()
    // Cakupan 5 artikel terbaru dikurangi berita utama = 4 baris, sama dengan beranda v0.1.
    expect(daftar.data.artikel).toHaveLength(4)
    const slug = [...sorotan.data.artikel, ...daftar.data.artikel].map((a) => a.slug)
    expect(new Set(slug).size).toBe(slug.length)
  })
  it('blok kabar hilang bila semua artikel dihapus, blok lain tetap', async () => {
    ambilDb().artikel = []
    const hasil = await ambilBerandaPublik('sungaisialang')
    expect(hasil.blok.map((b) => b.jenis)).toEqual(['lencana', 'layanan', 'pengumuman-agenda', 'angka', 'apbdes', 'potensi'])
  })
  it('blok pengumuman-agenda hilang bila pengumuman dan agenda kosong', async () => {
    const db = ambilDb()
    db.pengumuman = []
    db.agenda = []
    const hasil = await ambilBerandaPublik('sungaisialang')
    expect(hasil.blok.map((b) => b.jenis)).not.toContain('pengumuman-agenda')
  })
  it('halaman tambahan terbit bisa dibuka di /halaman/{nama}; nama yang tidak ada ditolak 404', async () => {
    masukSebagai(AKUN_UJI.operator)
    const halaman = { id: 'hlm_uji001', nama: 'sejarah-kampung', judul: 'Sejarah Kampung', blok: [susunBlok({ id: 'blk_uji001', jenis: 'teks' })] }
    await simpanDraf(TEMA, { ...susunanBawaan(), halaman: [halaman] })
    await terbitkan('Tambah halaman Sejarah Kampung.')
    const hasil = await ambilHalamanTambahan('sungaisialang', 'sejarah-kampung')
    expect(hasil.judul).toBe('Sejarah Kampung')
    expect(hasil.blok.map((b) => b.jenis)).toEqual(['teks'])
    const g = await galatDari(ambilHalamanTambahan('sungaisialang', 'tidak-ada'))
    expect(g).toMatchObject({ kode: 'NOT_FOUND', message: 'Halaman tidak ditemukan.' })
  })
  it('menu: halaman sistem tersembunyi hilang dari menu tetapi alamatnya tetap terbuka; tautan luar bertanda luar', async () => {
    masukSebagai(AKUN_UJI.operator)
    const menu: ItemMenu[] = [
      ...menuBawaan().map((m) => (m.jenis === 'sistem' && m.kunci === 'statistik' ? { ...m, tampil: false } : m)),
      { jenis: 'tautan', label: 'Situs Kecamatan', url: 'https://kecamatan.example.id' },
    ]
    await simpanDraf(TEMA, { ...susunanBawaan(), menu })
    await terbitkan('Ubah menu.')
    const identitas = await ambilIdentitasPublik('sungaisialang')
    expect(identitas.menu.map((m) => m.label)).toEqual([
      'Beranda', 'Profil', 'Kabar', 'Transparansi', 'Potensi', 'Layanan', 'Cek surat', 'Situs Kecamatan',
    ])
    expect(identitas.menu.at(-1)).toEqual({ label: 'Situs Kecamatan', href: 'https://kecamatan.example.id', luar: true })
    // Halaman Statistik disembunyikan dari menu, tetapi alamatnya tetap terbuka.
    expect(await ambilStatistikPublik('sungaisialang')).toBeDefined()
  })
  it('blok Ajakan ke halaman yang sudah dihapus dari data terbit dilewati tanpa galat', async () => {
    const situs = ambilDb().situs.find((s) => s.desaId === ID_SUNGAI_SIALANG)
    if (!situs) throw new Error('Situs Sungai Sialang tidak ada')
    situs.terbit.susunan.beranda.push(susunBlok({ id: 'blk_ajak999', jenis: 'ajakan', isi: { judul: 'Judul', tombol: 'Lihat', tujuan: 'hlm_hilang' } }))
    const hasil = await ambilBerandaPublik('sungaisialang')
    expect(hasil.blok.map((b) => b.jenis)).toEqual(SUSUNAN_WARTA)
  })
  it('menu bawaan sama dengan menu v0.1: Beranda lalu 7 halaman sistem', async () => {
    const identitas = await ambilIdentitasPublik('sungaisialang')
    expect(identitas.menu.map((m) => m.label)).toEqual([
      'Beranda', 'Profil', 'Kabar', 'Transparansi', 'Statistik', 'Potensi', 'Layanan', 'Cek surat',
    ])
    expect(identitas.menu.every((m) => !m.luar)).toBe(true)
  })
  it('susunan draf yang belum diterbitkan belum mengubah menu publik', async () => {
    masukSebagai(AKUN_UJI.operator)
    const menu = menuBawaan().map((m) => (m.jenis === 'sistem' && m.kunci === 'potensi' ? { ...m, tampil: false } : m))
    await simpanDraf(TEMA, { ...susunanBawaan(), menu })
    const identitas = await ambilIdentitasPublik('sungaisialang')
    expect(identitas.menu.map((m) => m.label)).toContain('Potensi')
  })
})
