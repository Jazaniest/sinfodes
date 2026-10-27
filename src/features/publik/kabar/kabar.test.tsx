import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { ArtikelPublik } from './ArtikelPublik'
import { DaftarKabar } from './DaftarKabar'

pakaiApiTiruan()

describe('Kabar desa (SPEC §9)', () => {
  it('daftar kabar terbit, terbaru dulu, dengan filter kategori berupa tautan', async () => {
    renderPublik(<DaftarKabar kategori={null} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Kabar desa' })).toBeInTheDocument()
    const kabar = await screen.findAllByRole('article')
    expect(kabar).toHaveLength(10)
    expect(kabar[0]).toHaveAccessibleName('Penyaluran BLT Tahap III Dijadwalkan 30 September')
    const filter = screen.getByRole('navigation', { name: 'Kategori kabar' })
    expect(within(filter).getByRole('link', { name: 'Semua' })).toHaveAttribute('aria-current', 'page')
    expect(within(filter).getByRole('link', { name: 'Budaya' })).toHaveAttribute('href', '/desa/sungaisialang/kabar?kategori=Budaya')
  })
  it('kategori terpilih: hanya kabar kategori itu, dan tautan kategorinya aktif', async () => {
    renderPublik(<DaftarKabar kategori="Budaya" />)
    expect(await screen.findByRole('link', { name: 'Tradisi Menumbai: Panen Madu Sialang Kembali Digelar' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    const filter = screen.getByRole('navigation', { name: 'Kategori kabar' })
    expect(within(filter).getByRole('link', { name: 'Budaya' })).toHaveAttribute('aria-current', 'page')
    expect(within(filter).getByRole('link', { name: 'Semua' })).not.toHaveAttribute('aria-current')
  })
  it('artikel: judul, penulis, tanggal, foto dengan kredit, dan isi nyaman dibaca di HP (17px, ±68 karakter)', async () => {
    renderPublik(<ArtikelPublik artikel="tradisi-menumbai-panen-madu-sialang-kembali-digelar" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Tradisi Menumbai: Panen Madu Sialang Kembali Digelar' })).toBeInTheDocument()
    expect(screen.getByText(/^Oleh Rosmiati · /)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Panen madu sialang' })).toHaveAttribute(
      'srcset', '/demo/foto/madu-sialang-960.jpg 960w, /demo/foto/madu-sialang.jpg 1280w',
    )
    expect(screen.getByRole('figure')).toHaveTextContent('Foto: Zhilal Darma · CC BY-SA 4.0')
    // 1ch = lebar angka "0"; huruf rata-rata IBM Plex Sans lebih sempit, jadi ±68 karakter teks ≈ 56ch (diukur di browser).
    expect(screen.getByText(/^Tradisi menumbai kembali digelar/).parentElement).toHaveClass('text-baca', 'max-w-[56ch]')
    expect(screen.getByRole('link', { name: '← Semua kabar' })).toHaveAttribute('href', '/desa/sungaisialang/kabar')
  })
  it('kabar yang masih draf atau alamat yang salah → "Kabar tidak ditemukan" dengan jalan kembali (fokus review 4)', async () => {
    renderPublik(<ArtikelPublik artikel="festival-bono-teluk-meranti-warga-siapkan-homestay" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Kabar tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lihat semua kabar' })).toHaveAttribute('href', '/desa/sungaisialang/kabar')
  })
})
