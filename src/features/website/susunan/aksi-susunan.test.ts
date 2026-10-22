import { describe, expect, it } from 'vitest'
import { blokBaru, susunBlok, type Blok, type JenisBlok } from '@/domain/website/blok'
import { susunanBawaan, type Susunan } from '@/domain/website/susunan'
import {
  aturMenuHalaman, aturTampilMenu, aturTersembunyi, blokTerpilihSesudahHapus, gandakanBlok, hapusBlok, hapusHalaman,
  hapusTautan, pindahBlok, pindahMenu, tambahBlok, tambahHalaman, tambahTautan, ubahHalaman,
} from './aksi-susunan'

const blokUji = (id: string, jenis: JenisBlok = 'teks'): Blok => blokBaru(jenis, id)

function susunanDengan(blok: Blok[]): Susunan {
  return { ...susunanBawaan(), beranda: blok }
}

describe('aksi susunan (rencana 7F-2 Tugas 3)', () => {
  it('tambahBlok menaruh blok baru sesudah blok terpilih, atau di akhir bila tidak ada yang terpilih', () => {
    const awal = susunanDengan([blokUji('blk_pertama'), blokUji('blk_kedua1')])
    const sesudah = tambahBlok(awal, 'beranda', 'blk_pertama', 'kabar')
    expect(sesudah).not.toBeNull()
    expect(sesudah!.susunan.beranda.map((b) => b.id)).toEqual(['blk_pertama', sesudah!.id, 'blk_kedua1'])
    expect(sesudah!.susunan.beranda[1]).toMatchObject({ id: sesudah!.id, jenis: 'kabar', tersembunyi: false })
    const diAkhir = tambahBlok(awal, 'beranda', null, 'teks')
    expect(diAkhir!.susunan.beranda.map((b) => b.id)).toEqual(['blk_pertama', 'blk_kedua1', diAkhir!.id])
    expect(diAkhir!.id).toMatch(/^blk_[a-z0-9]{6,}$/)
  })
  it('tambahBlok menolak blok ke-31 di satu halaman', () => {
    const penuh = susunanDengan(
      Array.from({ length: 30 }, (_, i) => blokUji(`blk_isi${String(i).padStart(3, '0')}`)),
    )
    expect(tambahBlok(penuh, 'beranda', null, 'teks')).toBeNull()
  })
  it('gandakanBlok memberi ID baru dan menaruh salinan tepat sesudahnya', () => {
    const asli = susunBlok({ id: 'blk_asli01', jenis: 'teks', isi: { judul: 'Judul', paragraf: ['Isi'], tautan: null } })
    const awal = susunanDengan([blokUji('blk_pertama'), asli])
    const hasil = gandakanBlok(awal, 'beranda', 'blk_asli01')
    expect(hasil.beranda.map((b) => b.id)).toEqual(['blk_pertama', 'blk_asli01', hasil.beranda[2].id])
    expect(hasil.beranda[2].id).not.toBe('blk_asli01')
    expect(hasil.beranda[2].isi).toEqual(asli.isi)
    expect(hasil.beranda[2].isi).not.toBe(asli.isi)
  })
  it('hapusBlok menghapus blok itu dari halaman yang benar', () => {
    const awal = susunanDengan([blokUji('blk_pertama'), blokUji('blk_kedua1')])
    const hasil = hapusBlok(awal, 'beranda', 'blk_pertama')
    expect(hasil.beranda.map((b) => b.id)).toEqual(['blk_kedua1'])
    expect(awal.beranda).toHaveLength(2)
  })
  it('pindahBlok memindahkan blok ke indeks tujuan', () => {
    const awal = susunanDengan([blokUji('blk_kotak1'), blokUji('blk_kotak2'), blokUji('blk_kotak3')])
    expect(pindahBlok(awal, 'beranda', 'blk_kotak1', 1).beranda.map((b) => b.id)).toEqual(['blk_kotak2', 'blk_kotak1', 'blk_kotak3'])
    expect(pindahBlok(awal, 'beranda', 'blk_kotak3', 0).beranda.map((b) => b.id)).toEqual(['blk_kotak3', 'blk_kotak1', 'blk_kotak2'])
  })
  it('aturTersembunyi hanya mengubah blok yang dituju', () => {
    const awal = susunanDengan([blokUji('blk_pertama'), blokUji('blk_kedua1')])
    const hasil = aturTersembunyi(awal, 'beranda', 'blk_kedua1', true)
    expect(hasil.beranda.map((b) => b.tersembunyi)).toEqual([false, true])
  })
  it('blokTerpilihSesudahHapus memilih blok sesudahnya; blok terakhir memilih sebelumnya', () => {
    const blok = [blokUji('blk_kotak1'), blokUji('blk_kotak2'), blokUji('blk_kotak3')]
    expect(blokTerpilihSesudahHapus(blok, 'blk_kotak1')).toBe('blk_kotak2')
    expect(blokTerpilihSesudahHapus(blok, 'blk_kotak2')).toBe('blk_kotak3')
    expect(blokTerpilihSesudahHapus(blok, 'blk_kotak3')).toBe('blk_kotak2')
    expect(blokTerpilihSesudahHapus([blokUji('blk_satu01')], 'blk_satu01')).toBeNull()
  })
})

const halaman = (id: string, nama: string, judul: string, blok: Blok[] = []) => ({ id, nama, judul, blok })

describe('aksi menu dan halaman (rencana 7F-2 Tugas 5)', () => {
  it('tambahHalaman mengusulkan nama dari judul, berisi satu blok Teks kosong, dan masuk menu di akhir', () => {
    const hasil = tambahHalaman(susunanBawaan(), 'Sejarah Kampung', 'sejarah-kampung')
    expect('galat' in hasil).toBe(false)
    if ('galat' in hasil) return
    expect(hasil.id).toMatch(/^hlm_[a-z0-9]{6,}$/)
    const baru = hasil.susunan.halaman[0]
    expect(baru).toMatchObject({ id: hasil.id, judul: 'Sejarah Kampung', nama: 'sejarah-kampung' })
    expect(baru.blok.map((b) => b.jenis)).toEqual(['teks'])
    expect(hasil.susunan.menu.at(-1)).toEqual({ jenis: 'halaman', halamanId: hasil.id })
  })
  it('tambahHalaman menolak halaman ke-11, nama cadangan, dan nama yang sudah dipakai', () => {
    const penuh: Susunan = {
      ...susunanBawaan(),
      halaman: Array.from({ length: 10 }, (_, i) => halaman(`hlm_uji00${i}`, `halaman-${i}`, `Halaman ${i}`)),
    }
    expect(tambahHalaman(penuh, 'Baru', 'baru-lagi')).toEqual({ galat: 'Paling banyak 10 halaman tambahan.' })
    expect(tambahHalaman(susunanBawaan(), 'Profil Desa', 'profil')).toEqual({ galat: 'Nama ini dipakai halaman sistem.' })
    const satu = tambahHalaman(susunanBawaan(), 'Sejarah', 'sejarah')
    if ('galat' in satu) throw new Error('seharusnya berhasil')
    expect(tambahHalaman(satu.susunan, 'Sejarah Dua', 'sejarah')).toEqual({ galat: 'Nama halaman sudah dipakai.' })
    expect(tambahHalaman(susunanBawaan(), 'Judul', 'Nama Besar')).toEqual({
      galat: 'Nama halaman 2-40 karakter: huruf kecil, angka, dan tanda hubung.',
    })
  })
  it('hapusHalaman ditolak bila menjadi tujuan blok Ajakan, dengan pesan persis', () => {
    const awal: Susunan = {
      ...susunanBawaan(),
      halaman: [halaman('hlm_uji001', 'sejarah', 'Sejarah Kampung')],
      beranda: [
        ...susunanBawaan().beranda,
        susunBlok({ id: 'blk_ajak001', jenis: 'ajakan', isi: { judul: 'Baca', tombol: 'Ke sana', tujuan: 'hlm_uji001' } }),
      ],
    }
    expect(hapusHalaman(awal, 'hlm_uji001')).toEqual({
      galat: 'Halaman ini menjadi tujuan blok Ajakan di Beranda. Ubah atau hapus blok itu dulu.',
    })
  })
  it('hapusHalaman menghapus halaman beserta item menunya', () => {
    const awal = tambahHalaman(susunanBawaan(), 'Sejarah Kampung', 'sejarah-kampung')
    if ('galat' in awal) throw new Error('seharusnya berhasil')
    const hasil = hapusHalaman(awal.susunan, awal.id)
    if ('galat' in hasil) throw new Error('seharusnya berhasil')
    expect(hasil.halaman).toHaveLength(0)
    expect(hasil.menu.some((m) => m.jenis === 'halaman' && m.halamanId === awal.id)).toBe(false)
  })
  it('ubahHalaman memperbarui judul dan nama, dan menolak nama yang bentrok', () => {
    const awal = tambahHalaman(susunanBawaan(), 'Sejarah Kampung', 'sejarah-kampung')
    if ('galat' in awal) throw new Error('seharusnya berhasil')
    const hasil = ubahHalaman(awal.susunan, awal.id, 'Sejarah Desa', 'sejarah-desa')
    if ('galat' in hasil) throw new Error('seharusnya berhasil')
    expect(hasil.halaman[0]).toMatchObject({ judul: 'Sejarah Desa', nama: 'sejarah-desa' })
    expect(ubahHalaman(awal.susunan, awal.id, 'Kabar', 'kabar')).toEqual({ galat: 'Nama ini dipakai halaman sistem.' })
  })
  it('pindahMenu, aturTampilMenu, aturMenuHalaman, dan hapusTautan mengubah menu', () => {
    const dasar = susunanBawaan()
    expect(pindahMenu(dasar, 0, 2).menu.map((m) => ('kunci' in m ? m.kunci : ''))).toEqual([
      'kabar', 'transparansi', 'profil', 'statistik', 'potensi', 'layanan', 'verifikasi',
    ])
    const mati = aturTampilMenu(dasar, 'statistik', false)
    expect(mati.menu.find((m) => m.jenis === 'sistem' && m.kunci === 'statistik')).toMatchObject({ tampil: false })
    const denganTautan = tambahTautan(dasar, 'Situs Kecamatan', 'https://kecamatan.example.id')
    if ('galat' in denganTautan) throw new Error('seharusnya berhasil')
    expect(denganTautan.menu.at(-1)).toEqual({ jenis: 'tautan', label: 'Situs Kecamatan', url: 'https://kecamatan.example.id' })
    expect(hapusTautan(denganTautan, denganTautan.menu.length - 1).menu.some((m) => m.jenis === 'tautan')).toBe(false)
    const ditambah = tambahHalaman(dasar, 'Sejarah', 'sejarah')
    if ('galat' in ditambah) throw new Error('seharusnya berhasil')
    const dikeluarkan = aturMenuHalaman(ditambah.susunan, ditambah.id, false)
    expect(dikeluarkan.menu.some((m) => m.jenis === 'halaman')).toBe(false)
    expect(dikeluarkan.halaman).toHaveLength(1)
  })
  it('tambahTautan menolak URL javascript: dan tautan ketiga', () => {
    expect(tambahTautan(susunanBawaan(), 'Situs', 'javascript:alert(1)')).toEqual({
      galat: 'Tautan harus diawali http:// atau https://.',
    })
    let s = susunanBawaan()
    for (const [label, url] of [['Satu', 'https://satu.example.id'], ['Dua', 'https://dua.example.id']] as const) {
      const t = tambahTautan(s, label, url)
      if ('galat' in t) throw new Error('seharusnya berhasil')
      s = t
    }
    expect(tambahTautan(s, 'Tiga', 'https://tiga.example.id')).toEqual({ galat: 'Paling banyak 2 tautan luar.' })
  })
})
