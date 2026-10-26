import { describe, expect, it, vi } from 'vitest'
import type { BlokTampil } from '@/domain/publik/schema'
import { VARIAN_BLOK, type IdLebar, type JenisBlok } from '@/domain/website/blok'
import { susunanBawaan } from '@/domain/website/susunan'
import { renderPublik } from '@/test/render'
import { RenderSusunan } from './RenderSusunan'

// Peta tidak memuat MapLibre di jsdom: pengamat tak pernah melapor bahwa blok terlihat.
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const DASAR = '/desa/sungaisialang'

const artikel = {
  slug: 'semenisasi-jalan-dusun-iii',
  judul: 'Semenisasi Jalan Dusun III Capai 70 Persen',
  kategori: 'Pembangunan' as const,
  tanggal: '2026-09-15T14:30:00+07:00',
  ringkasan: 'Pekerjaan jalan lingkungan Dusun III memasuki tahap akhir.',
  foto: null,
}

const lencana = {
  kode: 'LJ-A2B3C4D5',
  kalimat: 'Juara 1 Layanan Tercepat · Kabupaten Pelalawan · Agustus 2026',
  peringkat: 1,
  bersama: false,
  kategori: 'layanan' as const,
  tingkat: 'kabupaten' as const,
  periode: { musim: 'bulanan' as const, kode: '2026-08', label: 'Agustus 2026' },
}

const FOTO = { berkas: '/demo/foto/sampul-sungai-kampar.jpg', keterangan: 'Lanskap Sungai Kampar', kredit: null }

const DATA: Partial<Record<JenisBlok, unknown>> = {
  sampul: { nama: 'Sungai Sialang', sampul: FOTO },
  kabar: { artikel: [artikel] },
  angka: { nama: 'Sungai Sialang', angka: { jiwa: 2813, kk: 742, dusun: 4, rt: 21, luasKm2: 12.3 }, sampul: FOTO },
  ajakan: { href: '/desa/sungaisialang/layanan' },
  apbdes: { tahun: 2026, pendapatan: { anggaran: 1_830_000_000, realisasi: 1_100_000_000 }, belanja: { anggaran: 1_830_000_000, realisasi: 950_000_000 } },
  'pengumuman-agenda': {
    pengumuman: [{ id: 'pmn_1', judul: 'Penyaluran BLT Dana Desa Tahap III', isi: 'Penerima diminta datang ke kantor desa.', mulai: '2026-09-22', sampai: '2026-09-30' }],
    agenda: [{ id: 'agd_1', judul: 'Gotong Royong Parit RT 006-007', tanggal: '2026-09-28', mulai: '07.30', selesai: '10.00', tempat: 'Parit RT 006, Dusun II' }],
  },
  kontak: {
    nama: 'Sungai Sialang', alamatKantor: 'Jalan Lintas Selatan, Dusun I', telepon: '081266031140', surel: 'desa@sungaisialang.id',
    jamLayanan: [{ hari: 'Senin-Jumat', buka: '08.00', tutup: '15.00' }],
  },
  lencana: { lencana: [lencana] },
  pemisah: { motif: 'pucuk-rebung' },
  galeri: { foto: [FOTO] },
  peta: { lapisan: { pusat: [102.1, 0.5], zoom: 12, dusun: [], fasilitas: [], kegiatan: [] } },
  potensi: { potensi: [{ id: 'ptn_1', judul: 'Madu sialang', kategori: 'Perkebunan', foto: FOTO }] },
}

let nomorBlok = 0
function buatBlok(jenis: JenisBlok, varian: string, opsi: { isi?: unknown; lebar?: IdLebar } = {}): BlokTampil {
  nomorBlok += 1
  return {
    id: `blk_uji${String(nomorBlok).padStart(3, '0')}`,
    jenis,
    varian,
    lebar: opsi.lebar ?? 'penuh',
    tersembunyi: false,
    isi: opsi.isi ?? {},
    data: DATA[jenis],
  } as BlokTampil
}

describe('RenderSusunan (rencana 7F-1 Tugas 4)', () => {
  it('setiap jenis bagian 1 dengan setiap variannya merender bagian data-bagian yang benar', () => {
    const jenis: JenisBlok[] = ['sampul', 'kabar', 'layanan', 'angka', 'apbdes', 'pengumuman-agenda', 'kontak', 'lencana', 'pemisah', 'teks', 'ajakan']
    for (const j of jenis) {
      for (const v of VARIAN_BLOK[j]) {
        const isi =
          j === 'teks' ? { judul: 'Judul', paragraf: ['Isi paragraf.'], tautan: null }
          : j === 'ajakan' ? { judul: 'Judul', tombol: 'Lihat', tujuan: 'layanan' }
          : j === 'sampul' ? { kalimat: 'Selamat datang.' }
          : j === 'video' ? { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', judul: 'Video profil desa' }
          : j === 'sambutan' ? { nama: 'Nasir', jabatan: 'Kepala Desa', foto: null, teks: 'Selamat datang di website desa kami.' }
          : {}
        const { container, unmount } = renderPublik(<RenderSusunan blok={[buatBlok(j, v, { isi })]} dasar={DASAR} />)
        const bagian = container.querySelector(`[data-bagian="blok-${j}"]`)
        expect(bagian, `${j}:${v}`).not.toBeNull()
        expect(bagian?.getAttribute('data-varian'), `${j}:${v}`).toBe(v)
        expect(bagian?.getAttribute('aria-label'), `${j}:${v}`).toBeTruthy()
        unmount()
      }
    }
  })
  it('Layanan cepat: pintu Jadwal posyandu tampil, kecuali modul Kesehatan mati (SPEC-V0.2 12.3)', () => {
    const pintu = (data: unknown) => {
      const blok = { ...buatBlok('layanan', 'kisi'), data } as BlokTampil
      const { container, unmount } = renderPublik(<RenderSusunan blok={[blok]} dasar={DASAR} />)
      const teks = container.textContent ?? ''
      unmount()
      return teks
    }
    expect(pintu({ posyandu: true })).toContain('Jadwal posyandu')
    expect(pintu(undefined)).toContain('Jadwal posyandu')
    const mati = pintu({ posyandu: false })
    expect(mati).not.toContain('Jadwal posyandu')
    for (const tetap of ['Ajukan surat online', 'Cek keaslian surat', 'Sampaikan pengaduan']) expect(mati).toContain(tetap)
  })
  it('kelima jenis bagian 2 dengan variannya merender bagian data-bagian yang benar', () => {
    const jenis: JenisBlok[] = ['galeri', 'peta', 'potensi', 'video', 'sambutan']
    for (const j of jenis) {
      for (const v of VARIAN_BLOK[j]) {
        const isi =
          j === 'video' ? { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', judul: 'Video profil desa' }
          : j === 'sambutan' ? { nama: 'Nasir', jabatan: 'Kepala Desa', foto: null, teks: 'Selamat datang di website desa kami.' }
          : {}
        const { container, unmount } = renderPublik(<RenderSusunan blok={[buatBlok(j, v, { isi })]} dasar={DASAR} />)
        const bagian = container.querySelector(`[data-bagian="blok-${j}"]`)
        expect(bagian, `${j}:${v}`).not.toBeNull()
        expect(bagian?.getAttribute('data-varian'), `${j}:${v}`).toBe(v)
        unmount()
      }
    }
  })
  it('blok peta tidak memuat MapLibre di jsdom sampai terlihat', () => {
    const { container } = renderPublik(<RenderSusunan blok={[buatBlok('peta', 'lebar')]} dasar={DASAR} />)
    expect(container.querySelector('[data-bagian="blok-peta"]')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.textContent).not.toContain('Memuat peta')
  })
  it('blok lebar lalu sempit berada dalam satu wadah grid', () => {
    const lebar = buatBlok('kabar', 'daftar', { isi: { jumlah: 5 }, lebar: 'lebar' })
    const sempit = buatBlok('pengumuman-agenda', 'bertumpuk', { lebar: 'sempit' })
    const penuh = buatBlok('angka', 'kalimat')
    const { container } = renderPublik(<RenderSusunan blok={[lebar, sempit, penuh]} dasar={DASAR} />)
    const kabar = container.querySelector('[data-bagian="blok-kabar"]')
    const agenda = container.querySelector('[data-bagian="blok-pengumuman-agenda"]')
    const angka = container.querySelector('[data-bagian="blok-angka"]')
    expect(kabar?.parentElement).toBe(agenda?.parentElement)
    expect(kabar?.parentElement?.className).toContain('lg:grid-cols-[2fr_1fr]')
    expect(angka?.parentElement).not.toBe(kabar?.parentElement)
  })
  it('markup di blok Teks dan judul Ajakan tampil sebagai teks, tanpa elemen img (fokus review 1)', () => {
    const jahat = '<img src=x onerror=alert(1)>'
    const teks = buatBlok('teks', 'biasa', { isi: { judul: jahat, paragraf: [jahat], tautan: { label: 'Baca', url: 'https://contoh.id/x' } } })
    const ajakan = buatBlok('ajakan', 'pita', { isi: { judul: jahat, tombol: 'Klik', tujuan: 'layanan' } })
    const { container } = renderPublik(<RenderSusunan blok={[teks, ajakan]} dasar={DASAR} />)
    expect(container.textContent).toContain(jahat)
    expect(container.querySelector('img')).toBeNull()
  })
  it('tautan blok Teks ke alamat luar dibuka di tab baru, alamat halaman memakai tautan biasa', () => {
    const luar = buatBlok('teks', 'biasa', { isi: { judul: '', paragraf: ['Isi'], tautan: { label: 'Situs lain', url: 'https://contoh.id' } } })
    const dalam = buatBlok('teks', 'biasa', { isi: { judul: '', paragraf: ['Isi'], tautan: { label: 'Ke layanan', url: '/desa/sungaisialang/layanan' } } })
    const { container } = renderPublik(<RenderSusunan blok={[luar, dalam]} dasar={DASAR} />)
    const tautanLuar = container.querySelector('a[href="https://contoh.id"]')
    expect(tautanLuar?.getAttribute('target')).toBe('_blank')
    expect(tautanLuar?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(tautanLuar?.textContent).toContain('(membuka situs lain)')
    expect(container.querySelector('a[href="https://contoh.id"]')?.getAttribute('target')).toBe('_blank')
    const tautanDalam = container.querySelector('a[href="/desa/sungaisialang/layanan"]')
    expect(tautanDalam?.getAttribute('target')).toBeNull()
  })
  it('jenis blok yang tidak dikenal dilewati tanpa galat', () => {
    const asing = buatBlok('tak-ada' as JenisBlok, 'biasa')
    const { container } = renderPublik(<RenderSusunan blok={[asing, buatBlok('pemisah', 'garis')]} dasar={DASAR} />)
    expect(container.querySelectorAll('[data-bagian^="blok-"]')).toHaveLength(1)
  })
  it('susunan Warta merender judul Kabar terbaru, Pengumuman, Agenda, dan Desa dalam angka seperti v0.1', () => {
    const warta = susunanBawaan().beranda.map((b) => buatBlok(b.jenis, b.varian, { isi: b.isi, lebar: b.lebar }))
    const { container } = renderPublik(<RenderSusunan blok={warta} dasar={DASAR} />)
    for (const judul of ['Kabar terbaru', 'Pengumuman', 'Agenda', 'Desa dalam angka', 'Layanan cepat']) {
      expect(container.textContent, judul).toContain(judul)
    }
    expect(container.querySelector('[data-bagian="blok-kabar"][data-varian="sorotan"]')).not.toBeNull()
    expect(container.querySelector('[data-bagian="blok-kabar"][data-varian="daftar"]')).not.toBeNull()
    expect(container.querySelector('[data-bagian="blok-layanan"][data-varian="kisi"]')).not.toBeNull()
    expect(container.querySelector('[data-bagian="blok-angka"][data-varian="kalimat"]')).not.toBeNull()
    expect(container.querySelector('[data-bagian="sampul"]')).not.toBeNull()
    expect(container.querySelector('[data-bagian="blok-pengumuman"]')).not.toBeNull()
    expect(container.querySelector('[data-bagian="blok-agenda"]')).not.toBeNull()
  })
})
