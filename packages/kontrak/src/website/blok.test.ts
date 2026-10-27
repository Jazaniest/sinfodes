import { describe, expect, it } from 'vitest'
import { blokBaru, blokSchema, idVideoYoutube, isiBawaan, JENIS_BLOK, susunBlok, VARIAN_BLOK } from './blok'

const pesan = (hasil: ReturnType<typeof blokSchema.safeParse>) => (hasil.success ? [] : hasil.error.issues.map((i) => i.message))

describe('Katalog blok (rencana 7F-1 Tugas 1)', () => {
  it('idVideoYoutube menerima tiga bentuk alamat YouTube dan menghasilkan ID 11 karakter', () => {
    expect(idVideoYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idVideoYoutube('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idVideoYoutube('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idVideoYoutube('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30')).toBe('dQw4w9WgXcQ')
  })
  it('idVideoYoutube menolak vimeo dan ID YouTube yang tidak 11 karakter', () => {
    expect(idVideoYoutube('https://vimeo.com/123456789')).toBeNull()
    expect(idVideoYoutube('https://www.youtube.com/watch?v=pendek')).toBeNull()
    expect(idVideoYoutube('')).toBeNull()
  })
  it('blokBaru setiap jenis lolos blokSchema, dengan varian pertama sebagai bawaan', () => {
    for (const jenis of JENIS_BLOK) {
      const blok = blokBaru(jenis, 'blk_abc123')
      const hasil = blokSchema.safeParse(blok)
      expect(hasil.success, `${jenis}: ${pesan(hasil).join(' | ')}`).toBe(true)
      expect(blok.varian, jenis).toBe(VARIAN_BLOK[jenis][0])
      expect(blok.lebar, jenis).toBe('penuh')
      expect(blok.tersembunyi, jenis).toBe(false)
    }
  })
  it('susunBlok menimpa isi bawaan dan lolos skema', () => {
    const blok = susunBlok({ id: 'blk_warta01', jenis: 'kabar', varian: 'sorotan', isi: { jumlah: 1 } })
    expect(blok.isi).toEqual({ jumlah: 1 })
    expect(blokSchema.safeParse(blok).success).toBe(true)
  })
  it('tautan blok Teks bertujuan javascript: ditolak skema (fokus review 1)', () => {
    const hasil = blokSchema.safeParse({
      id: 'blk_abc123', jenis: 'teks', varian: 'biasa', lebar: 'penuh', tersembunyi: false,
      isi: { judul: 'Tautan', paragraf: ['Isi'], tautan: { label: 'Klik', url: 'javascript:alert(1)' } },
    })
    expect(hasil.success).toBe(false)
    expect(pesan(hasil)).toEqual(['Tautan harus diawali http:// atau https://.'])
  })
  it('tautan blok Teks menerima alamat halaman dan alamat web http', () => {
    const dasar = { id: 'blk_abc123', jenis: 'teks', varian: 'biasa', lebar: 'penuh', tersembunyi: false, isi: { judul: '', paragraf: ['Isi'], tautan: null } }
    for (const url of ['/desa/sungaisialang/layanan', 'https://contoh.id/artikel']) {
      const hasil = blokSchema.safeParse({ ...dasar, isi: { ...dasar.isi, tautan: { label: 'Baca', url } } })
      expect(hasil.success, url).toBe(true)
    }
  })
  it('alamat video yang tidak dikenali ditolak dengan pesan persis', () => {
    const hasil = blokSchema.safeParse({
      id: 'blk_abc123', jenis: 'video', varian: 'lebar', lebar: 'penuh', tersembunyi: false,
      isi: { url: 'https://vimeo.com/123456789', judul: 'Video' },
    })
    expect(hasil.success).toBe(false)
    expect(pesan(hasil)).toEqual(['Alamat video YouTube tidak dikenali.'])
  })
  it('batas panjang isian ditegakkan dengan pesan Paling banyak {n} karakter.', () => {
    const hasil = blokSchema.safeParse({
      id: 'blk_abc123', jenis: 'sampul', varian: 'foto-besar', lebar: 'penuh', tersembunyi: false,
      isi: { kalimat: 'x'.repeat(161) },
    })
    expect(hasil.success).toBe(false)
    expect(pesan(hasil)).toEqual(['Paling banyak 160 karakter.'])
  })
  it('paragraf blok Teks 1-5 buah, masing-masing paling banyak 1.200 karakter', () => {
    const buat = (paragraf: string[]) =>
      blokSchema.safeParse({ id: 'blk_abc123', jenis: 'teks', varian: 'biasa', lebar: 'penuh', tersembunyi: false, isi: { judul: '', paragraf, tautan: null } })
    expect(pesan(buat([]))).toEqual(['Paling sedikit 1 paragraf.'])
    expect(pesan(buat(Array.from({ length: 6 }, () => 'x')))).toEqual(['Paling banyak 5 paragraf.'])
    expect(pesan(buat(['x'.repeat(1201)]))).toEqual(['Paling banyak 1.200 karakter.'])
  })
  it('isi bawaan setiap jenis lolos skema', () => {
    for (const jenis of JENIS_BLOK) {
      expect(blokSchema.safeParse(blokBaru(jenis, 'blk_uji001')).success, jenis).toBe(true)
      expect(isiBawaan(jenis), jenis).toBeDefined()
    }
  })
})
