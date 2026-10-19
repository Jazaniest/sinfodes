import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderDenganRouter } from '@/test/router'
import { HalamanLanding } from './HalamanLanding'

pakaiApiTiruan()

const pasang = () =>
  renderDenganRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HalamanLanding />
    </QueryClientProvider>,
  )

describe('halaman utama Sinfodes (SPEC-V0.2 §4.4)', () => {
  it('pembuka: janji utama, daftar lewat WhatsApp, dan jalan ke Cari desa', async () => {
    await pasang()
    expect(screen.getByRole('heading', { level: 1, name: 'Surat, data penduduk, dan website desa dalam satu tempat.' })).toBeInTheDocument()
    expect(screen.getByText('Sinfodes · Sistem Informasi Desa')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Daftarkan desa Anda' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6280000000000\?text=/)
    expect(screen.getByRole('link', { name: 'Cari desa Anda' })).toHaveAttribute('href', '#cari-desa')
  })
  it('kepala: tautan ke bagian halaman, termasuk Coba demo di build demo', async () => {
    await pasang()
    const nav = screen.getByRole('navigation', { name: 'Bagian halaman' })
    expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Bagian aplikasi', '#bagian-aplikasi'],
      ['Harga', '#harga'],
      ['Cari desa', '#cari-desa'],
      ['Coba demo', '#coba-demo'],
    ])
  })
  it('bagian aplikasi: empat lampiran, masing-masing dengan gambar ber-alt (dasbor kabupaten di 7B-3)', async () => {
    await pasang()
    const bagian = screen.getByRole('region', { name: 'Bagian aplikasi' })
    for (const judul of ['Panel perangkat desa', 'Layanan warga dari HP', 'Website desa', 'Dasbor kabupaten']) {
      expect(within(bagian).getByRole('heading', { level: 3, name: judul })).toBeInTheDocument()
    }
    expect(within(bagian).getByText('Lampiran 4')).toBeInTheDocument()
    const gambar = within(bagian).getAllByRole('img')
    expect(gambar).toHaveLength(4)
    for (const g of gambar) expect(g.getAttribute('alt')?.trim()).toBeTruthy()
  })
  it('bukti: jumlah desa bergabung dari API, berlabel Data contoh di build demo', async () => {
    await pasang()
    expect(await screen.findByText('38 desa sudah memakai Sinfodes.')).toBeInTheDocument()
    expect(screen.getByText('Data contoh')).toBeInTheDocument()
  })
  it('bukti: kabupaten mitra, tiap nama bertautan ke portal kabupatennya (SPEC-V0.2 §8.2)', async () => {
    await pasang()
    const baris = (await screen.findByText(/^Kabupaten mitra:/)).closest('p')
    if (!baris) throw new Error('baris kabupaten mitra tidak ada')
    expect(baris).toHaveTextContent('Kabupaten mitra: Pelalawan · Siak')
    expect(within(baris).getByRole('link', { name: 'Pelalawan' })).toHaveAttribute('href', 'http://kab-pelalawan.sinfodes.localhost:3000/')
    expect(within(baris).getByRole('link', { name: 'Siak' })).toHaveAttribute('href', 'http://kab-siak.sinfodes.localhost:3000/')
  })
  it('paket dan harga: tabel dua paket dengan harga tahunan, dan catatan triwulan', async () => {
    await pasang()
    const tabel = screen.getByRole('table', { name: 'Paket dan harga' })
    expect(within(tabel).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Dasar', 'Lengkap'])
    expect(within(tabel).getAllByRole('rowheader').map((th) => th.textContent)).toEqual([
      'Modul', 'Akun perangkat desa', 'Penyimpanan berkas', 'Bantuan', 'Pelatihan operator', 'Impor data awal', 'Harga per tahun',
    ])
    expect(within(tabel).getByRole('cell', { name: 'Rp6.000.000' })).toBeInTheDocument()
    expect(within(tabel).getByRole('cell', { name: 'Rp12.000.000' })).toBeInTheDocument()
    expect(screen.getByText('Bisa dibayar per triwulan: Rp1.500.000 (Dasar) atau Rp3.000.000 (Lengkap).')).toBeInTheDocument()
  })
  it('Cari desa dan Coba demo ada di halaman', async () => {
    await pasang()
    expect(screen.getByRole('heading', { level: 2, name: 'Cari desa Anda' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Coba demo' })).toBeInTheDocument()
  })
  it('kaki halaman: surel, Masuk Konsol, dan Kebijakan privasi', async () => {
    await pasang()
    const kaki = screen.getByRole('contentinfo')
    expect(within(kaki).getByRole('link', { name: 'daftar@sinfodes.example' })).toHaveAttribute('href', 'mailto:daftar@sinfodes.example')
    expect(within(kaki).getByRole('link', { name: 'Masuk Konsol' })).toHaveAttribute('href', 'http://konsol.sinfodes.localhost:3000/')
    expect(within(kaki).getByRole('link', { name: 'Kebijakan privasi' })).toHaveAttribute('href', '/privasi')
  })
})
