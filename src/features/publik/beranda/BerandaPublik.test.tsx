import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { BerandaPublik } from './BerandaPublik'

pakaiApiTiruan()

describe('Beranda website desa (SPEC §9)', () => {
  it('berita utama dengan foto besar, keterangan, dan kredit; bukan banner sambutan', async () => {
    renderPublik(<BerandaPublik />)
    const utama = await screen.findByRole('article', { name: 'Penyaluran BLT Tahap III Dijadwalkan 30 September' })
    const foto = within(utama).getByRole('img', { name: 'Penyaluran bantuan' })
    expect(foto).toHaveAttribute('loading', 'eager')
    expect(foto).toHaveAttribute('srcset', '/demo/foto/penyaluran-bantuan-960.jpg 960w, /demo/foto/penyaluran-bantuan.jpg 1280w')
    expect(utama).toHaveTextContent('Foto: Sakila Karema · CC0')
    expect(within(utama).getByRole('link', { name: 'Penyaluran BLT Tahap III Dijadwalkan 30 September' })).toHaveAttribute(
      'href', '/desa/sungai-sialang/kabar/penyaluran-blt-tahap-iii-dijadwalkan-30-september',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Beranda Desa Sungai Sialang' })).toBeInTheDocument()
    expect(screen.queryByText(/selamat datang/i)).not.toBeInTheDocument()
  })
  it('empat layanan cepat menuju layanan mandiri, cek surat, pengaduan, dan jadwal posyandu', async () => {
    renderPublik(<BerandaPublik />)
    const layanan = await screen.findByRole('region', { name: 'Layanan cepat' })
    expect(within(layanan).getAllByRole('link')).toHaveLength(4)
    expect(within(layanan).getByRole('link', { name: /^Ajukan surat online/ })).toHaveAttribute('href', '/warga/ajukan')
    expect(within(layanan).getByRole('link', { name: /^Cek keaslian surat/ })).toHaveAttribute('href', '/desa/sungai-sialang/verifikasi')
    expect(within(layanan).getByRole('link', { name: /^Sampaikan pengaduan/ })).toHaveAttribute('href', '/warga/pengaduan/baru')
    expect(within(layanan).getByRole('link', { name: /^Jadwal posyandu/ })).toHaveAttribute('href', '/desa/sungai-sialang/layanan#posyandu')
  })
  it('kabar terbaru, pengumuman yang berlaku, agenda, dan desa dalam angka', async () => {
    renderPublik(<BerandaPublik />)
    const kabar = await screen.findByRole('region', { name: 'Kabar terbaru' })
    expect(within(kabar).getAllByRole('article')).toHaveLength(4)
    expect(within(kabar).getByRole('link', { name: 'Semua kabar' })).toHaveAttribute('href', '/desa/sungai-sialang/kabar')
    expect(within(screen.getByRole('region', { name: 'Pengumuman' })).getAllByRole('listitem')).toHaveLength(3)
    const agenda = screen.getByRole('region', { name: 'Agenda' })
    expect(within(agenda).getAllByRole('listitem')).toHaveLength(5)
    expect(agenda).toHaveTextContent('Penyaluran BLT Dana Desa Tahap III')
    expect(agenda).toHaveTextContent('09.00–12.00 WIB · Kantor Desa')
    const angka = screen.getByRole('region', { name: 'Desa dalam angka' })
    expect(angka).toHaveTextContent(/Desa Sungai Sialang dihuni [\d.]+ jiwa dalam [\d.]+ keluarga, tersebar di 4 dusun/)
    expect(within(angka).getByRole('img', { name: 'Lanskap Sungai Kampar' })).toHaveAttribute('loading', 'lazy')
  })
})
