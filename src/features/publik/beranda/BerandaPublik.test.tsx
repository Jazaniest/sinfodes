import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { keAlamat } from '@/app/alamat'
import { ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { BerandaPublik } from './BerandaPublik'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Beranda website desa (SPEC §9)', () => {
  it('setiap bagian bernama sesuai kontrak tema v1 (rencana 7E-1)', async () => {
    const { container } = renderPublik(<BerandaPublik />)
    await screen.findByRole('region', { name: 'Layanan cepat' })
    await screen.findByRole('region', { name: 'APBDes 2026' })
    for (const bagian of ['blok-kabar', 'blok-layanan', 'blok-pengumuman', 'blok-agenda', 'blok-angka', 'blok-apbdes', 'blok-potensi', 'sampul']) {
      expect(container.querySelector(`[data-bagian="${bagian}"]`), bagian).not.toBeNull()
    }
  })
  it('berita utama dengan foto besar, keterangan, dan kredit; bukan banner sambutan', async () => {
    renderPublik(<BerandaPublik />)
    const utama = await screen.findByRole('article', { name: 'Penyaluran BLT Tahap III Dijadwalkan 30 September' })
    const foto = within(utama).getByRole('img', { name: 'Penyaluran bantuan' })
    expect(foto).toHaveAttribute('loading', 'eager')
    expect(foto).toHaveAttribute('srcset', '/demo/foto/penyaluran-bantuan-960.jpg 960w, /demo/foto/penyaluran-bantuan.jpg 1280w')
    expect(utama).toHaveTextContent('Foto: Sakila Karema · CC0')
    expect(within(utama).getByRole('link', { name: 'Penyaluran BLT Tahap III Dijadwalkan 30 September' })).toHaveAttribute(
      'href', '/desa/sungaisialang/kabar/penyaluran-blt-tahap-iii-dijadwalkan-30-september',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Beranda Desa Sungai Sialang' })).toBeInTheDocument()
    expect(screen.queryByText(/selamat datang/i)).not.toBeInTheDocument()
  })
  it('empat layanan cepat menuju layanan mandiri, cek surat, pengaduan, dan jadwal posyandu', async () => {
    renderPublik(<BerandaPublik />)
    const layanan = await screen.findByRole('region', { name: 'Layanan cepat' })
    expect(within(layanan).getAllByRole('link')).toHaveLength(4)
    expect(within(layanan).getByRole('link', { name: /^Ajukan surat online/ })).toHaveAttribute('href', '/warga/ajukan')
    expect(within(layanan).getByRole('link', { name: /^Cek keaslian surat/ })).toHaveAttribute('href', '/desa/sungaisialang/verifikasi')
    expect(within(layanan).getByRole('link', { name: /^Sampaikan pengaduan/ })).toHaveAttribute('href', '/warga/pengaduan/baru')
    expect(within(layanan).getByRole('link', { name: /^Jadwal posyandu/ })).toHaveAttribute('href', '/desa/sungaisialang/layanan#posyandu')
  })
  it('kabar terbaru, pengumuman yang berlaku, agenda, dan desa dalam angka', async () => {
    renderPublik(<BerandaPublik />)
    const kabar = await screen.findByRole('region', { name: 'Kabar terbaru' })
    expect(within(kabar).getAllByRole('article')).toHaveLength(4)
    expect(within(kabar).getByRole('link', { name: 'Semua kabar' })).toHaveAttribute('href', '/desa/sungaisialang/kabar')
    expect(within(screen.getByRole('region', { name: 'Pengumuman' })).getAllByRole('listitem')).toHaveLength(3)
    const agenda = screen.getByRole('region', { name: 'Agenda' })
    expect(within(agenda).getAllByRole('listitem')).toHaveLength(5)
    expect(agenda).toHaveTextContent('Penyaluran BLT Dana Desa Tahap III')
    expect(agenda).toHaveTextContent('09.00-12.00 WIB · Kantor Desa')
    const angka = screen.getByRole('region', { name: 'Desa dalam angka' })
    expect(angka).toHaveTextContent(/Desa Sungai Sialang dihuni [\d.]+ jiwa dalam [\d.]+ keluarga, tersebar di 4 dusun/)
    expect(within(angka).getByRole('img', { name: 'Lanskap Sungai Kampar' })).toHaveAttribute('loading', 'lazy')
  })
  it('cuplikan APBDes (MiniBar pendapatan dan belanja) dan potensi desa, menuju Transparansi dan Potensi (SPEC §9)', async () => {
    renderPublik(<BerandaPublik />)
    const apbdes = await screen.findByRole('region', { name: 'APBDes 2026' })
    expect(within(apbdes).getByRole('meter', { name: 'Pendapatan' })).toHaveAttribute('aria-valuetext', expect.stringMatching(/^\d+,\d%$/))
    expect(within(apbdes).getByRole('meter', { name: 'Belanja' })).toBeInTheDocument()
    expect(apbdes).toHaveTextContent('dari Rp1,83 M')
    expect(within(apbdes).getByRole('link', { name: 'Rincian APBDes' })).toHaveAttribute('href', '/desa/sungaisialang/transparansi')
    const potensi = screen.getByRole('region', { name: 'Potensi desa' })
    expect(within(potensi).getAllByRole('listitem')).toHaveLength(6)
    expect(within(potensi).getByRole('link', { name: /Madu sialang$/ })).toHaveAttribute('href', '/desa/sungaisialang/potensi#ptn_ss_01')
    expect(within(potensi).getByRole('link', { name: 'Potensi dan UMKM' })).toHaveAttribute('href', '/desa/sungaisialang/potensi')
    expect(potensi.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })
  it('desa yang belum mengumumkan APBDes dan potensi: kedua rubrik dilewati (fokus review 1)', async () => {
    ubahDb((d) => {
      d.apbdes = []
      d.potensi = []
    })
    renderPublik(<BerandaPublik />)
    expect(await screen.findByRole('region', { name: 'Desa dalam angka' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /^APBDes/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Potensi desa' })).not.toBeInTheDocument()
  })
  it('lencana juara: deret di atas berita utama, tautan ke bukti di alamat induk (7C-2)', async () => {
    renderPublik(<BerandaPublik />)
    const deret = await screen.findByRole('region', { name: 'Lencana juara' })
    const tautan = within(deret).getAllByRole('link')
    expect(tautan.length).toBeGreaterThan(0)
    expect(tautan.length).toBeLessThanOrEqual(6)
    const href = tautan[0].getAttribute('href') ?? ''
    expect(href).toMatch(/\/lencana\/LJ-[0-9A-HJKMNP-TV-Z]{8}$/)
    expect(href).toBe(keAlamat({ jenis: 'induk' }, `/lencana/${href.split('/').pop()}`))
    const utama = screen.getByRole('article', { name: 'Penyaluran BLT Tahap III Dijadwalkan 30 September' })
    expect(deret.compareDocumentPosition(utama) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('tanpa lencana: deret tidak tampil', async () => {
    ubahDb((d) => {
      d.lencana = []
    })
    renderPublik(<BerandaPublik />)
    expect(await screen.findByRole('region', { name: 'Layanan cepat' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Lencana juara' })).not.toBeInTheDocument()
  })
})
