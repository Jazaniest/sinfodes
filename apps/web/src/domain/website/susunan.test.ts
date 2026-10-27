import { describe, expect, it } from 'vitest'
import { blokBaru, susunBlok, type Blok } from './blok'
import {
  itemMenuSchema, menuBawaan, pasanganBerdampingan, susunanBawaan, susunanSchema, type ItemMenu, type Susunan,
} from './susunan'

const pesan = (s: Susunan): string[] => {
  const hasil = susunanSchema.safeParse(s)
  return hasil.success ? [] : hasil.error.issues.map((i) => i.message)
}
const blok = (i: number): Blok => blokBaru('pemisah', `blk_uji${String(i).padStart(3, '0')}`)
const halaman = (i: number, nama: string, blokHalaman: Blok[] = []) => ({ id: `hlm_uji${String(i).padStart(3, '0')}`, nama, judul: `Halaman ${nama}`, blok: blokHalaman })

describe('Susunan website (rencana 7F-1 Tugas 1)', () => {
  it('menerima susunanBawaan: beranda Warta 8 blok, tanpa halaman tambahan, menu bawaan 7 item', () => {
    const s = susunanBawaan()
    expect(susunanSchema.safeParse(s).success).toBe(true)
    expect(s.beranda.map((b) => `${b.jenis}:${b.varian}`)).toEqual([
      'lencana:deret', 'kabar:sorotan', 'layanan:kisi', 'kabar:daftar',
      'pengumuman-agenda:bertumpuk', 'angka:kalimat', 'apbdes:batang', 'potensi:kartu',
    ])
    expect(s.halaman).toEqual([])
    expect(s.menu).toEqual(menuBawaan())
    expect(s.menu).toHaveLength(7)
    expect(menuBawaan().map((m) => (m.jenis === 'sistem' ? m.kunci : ''))).toEqual([
      'profil', 'kabar', 'transparansi', 'statistik', 'potensi', 'layanan', 'verifikasi',
    ])
  })
  it('menolak nama halaman cadangan dengan pesan persis', () => {
    const s = { ...susunanBawaan(), halaman: [halaman(1, 'kabar')] }
    expect(pesan(s)).toEqual(['Nama ini dipakai halaman sistem.'])
  })
  it('menolak nama halaman ganda dengan pesan persis', () => {
    const s = { ...susunanBawaan(), halaman: [halaman(1, 'sejarah'), halaman(2, 'sejarah')] }
    expect(pesan(s)).toEqual(['Nama halaman sudah dipakai.'])
  })
  it('menolak lebih dari 10 halaman dengan pesan persis', () => {
    const s = { ...susunanBawaan(), halaman: Array.from({ length: 11 }, (_, i) => halaman(i + 1, `halaman-${i + 1}`)) }
    expect(pesan(s)).toContain('Paling banyak 10 halaman tambahan.')
  })
  it('menolak lebih dari 30 blok di beranda dan di halaman tambahan dengan pesan persis', () => {
    const beranda = { ...susunanBawaan(), beranda: Array.from({ length: 31 }, (_, i) => blok(i + 1)) }
    expect(pesan(beranda)).toEqual(['Paling banyak 30 blok di satu halaman.'])
    const hal = { ...susunanBawaan(), halaman: [halaman(1, 'sejarah', Array.from({ length: 31 }, (_, i) => blok(i + 1)))] }
    expect(pesan(hal)).toEqual(['Paling banyak 30 blok di satu halaman.'])
  })
  it('menolak lebih dari 2 tautan luar dengan pesan persis', () => {
    const tautan = (i: number): ItemMenu => ({ jenis: 'tautan', label: `Tautan ${i}`, url: `https://contoh${i}.id` })
    const s: Susunan = { ...susunanBawaan(), menu: [...menuBawaan(), tautan(1), tautan(2), tautan(3)] }
    expect(pesan(s)).toEqual(['Paling banyak 2 tautan luar.'])
  })
  it('menolak menu tanpa Cek surat (verifikasi) dan menu dengan Layanan disembunyikan', () => {
    const tanpaVerifikasi: Susunan = { ...susunanBawaan(), menu: menuBawaan().filter((m) => !(m.jenis === 'sistem' && m.kunci === 'verifikasi')) }
    expect(pesan(tanpaVerifikasi)).toEqual(['Layanan dan Cek keaslian wajib ada di menu.'])
    const layananSembunyi: Susunan = {
      ...susunanBawaan(),
      menu: menuBawaan().map((m) => (m.jenis === 'sistem' && m.kunci === 'layanan' ? { ...m, tampil: false } : m)),
    }
    expect(pesan(layananSembunyi)).toEqual(['Layanan dan Cek keaslian wajib ada di menu.'])
  })
  it('menolak tautan luar javascript: dengan pesan persis', () => {
    const hasil = itemMenuSchema.safeParse({ jenis: 'tautan', label: 'Klik', url: 'javascript:alert(1)' })
    expect(hasil.success).toBe(false)
    expect(hasil.success ? [] : hasil.error.issues.map((i) => i.message)).toEqual(['Tautan harus diawali http:// atau https://.'])
  })
  it('menolak ajakan ke halaman yang tidak ada dengan pesan persis', () => {
    const ajakan = (tujuan: string): Blok => susunBlok({ id: 'blk_ajak001', jenis: 'ajakan', isi: { judul: 'Judul', tombol: 'Lihat', tujuan } })
    const beranda = { ...susunanBawaan(), beranda: [ajakan('hlm_hilang')] }
    expect(pesan(beranda)).toEqual(['Tujuan ajakan tidak ditemukan.'])
    const hal = { ...susunanBawaan(), halaman: [halaman(1, 'sejarah', [ajakan('hlm_hilang')])] }
    expect(pesan(hal)).toEqual(['Tujuan ajakan tidak ditemukan.'])
  })
  it('menerima ajakan ke halaman sistem dan ke halaman tambahan yang ada', () => {
    const ajakan = (tujuan: string): Blok => susunBlok({ id: 'blk_ajak001', jenis: 'ajakan', isi: { judul: 'Judul', tombol: 'Lihat', tujuan } })
    const s: Susunan = { ...susunanBawaan(), halaman: [halaman(1, 'sejarah')], beranda: [ajakan('layanan'), ajakan('hlm_uji001')] }
    expect(pesan(s)).toEqual([])
  })
  it('pasanganBerdampingan memasangkan lebar lalu sempit, dan tidak memasangkan sempit lalu lebar', () => {
    const dgnLebar = (i: number, lebar: Blok['lebar']): Blok => ({ ...blok(i), lebar })
    const [penuh, lebar, sempit, lebar2, sempit2] = [dgnLebar(1, 'penuh'), dgnLebar(2, 'lebar'), dgnLebar(3, 'sempit'), dgnLebar(4, 'lebar'), dgnLebar(5, 'sempit')]
    expect(pasanganBerdampingan([penuh, lebar, sempit, lebar2, sempit2])).toEqual([penuh, [lebar, sempit], [lebar2, sempit2]])
    expect(pasanganBerdampingan([sempit, lebar, penuh])).toEqual([sempit, lebar, penuh])
    expect(pasanganBerdampingan([lebar, lebar, sempit])).toEqual([lebar, [lebar, sempit]])
  })
})
