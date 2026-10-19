import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PropsPetaTitikDesa } from '@/features/peta/PetaTitikDesa'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { PetaKabupaten } from './PetaKabupaten'

// jsdom tidak punya WebGL: komponen MapLibre diganti tiruan yang memperlihatkan props dan bisa "mengeklik" titik.
vi.mock('@/features/peta/PetaTitikDesa', () => ({
  default: (p: PropsPetaTitikDesa) => (
    <div data-testid="peta-tiruan">
      <p>{`${p.titik.length} titik, warna ${[...new Set(p.titik.map((t) => t.warna))].sort().join(',')}`}</p>
      <button type="button" onClick={() => p.onPilih('desa_sungai_sialang')}>
        klik Sungai Sialang di peta
      </button>
      <button type="button" onClick={p.onGagal}>
        peta gagal
      </button>
    </div>
  ),
}))

pakaiApiTiruan()

function pasang() {
  masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
  renderKabupaten(<PetaKabupaten />, contohSesiKabupaten(AKUN_KABUPATEN_UJI.admin))
  return userEvent.setup()
}

describe('Peta di dasbor kabupaten (SPEC-V0.2 §8.3 butir 5)', () => {
  it('lapisan status bergabung lebih dulu; legenda berganti saat lapisan realisasi dipilih', async () => {
    const user = pasang()
    expect(await screen.findByText(/^32 titik/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Peta' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Status bergabung' })).toBeChecked()
    const legenda = screen.getByRole('list', { name: 'Keterangan warna' })
    expect(within(legenda).getAllByRole('listitem').map((l) => l.textContent?.replace(/\s\(\d+\)$/, ''))).toEqual([
      'Aktif', 'Uji coba', 'Persiapan', 'Ditangguhkan',
    ])
    await user.click(screen.getByRole('radio', { name: 'Realisasi Dana Desa' }))
    expect(within(screen.getByRole('list', { name: 'Keterangan warna' })).getAllByRole('listitem')[0]).toHaveTextContent('Tertinggal (2)')
    expect(screen.getByText(/warna #28704F,#5A636C,#8A6212,#A03A2C$/)).toBeInTheDocument()
    expect(screen.getByText('Letak titik perkiraan di sekitar pusat kecamatan, kecuali desa yang sudah menggambar Peta Desa.')).toBeInTheDocument()
  })
  it('memilih desa dari daftar atau dari peta membuka kartu desanya', async () => {
    const user = pasang()
    const daftar = await screen.findByRole('table', { name: 'Daftar desa di peta' })
    expect(screen.getByText('Pilih titik atau nama desa untuk melihat kartunya.')).toBeInTheDocument()
    await user.click(within(daftar).getByRole('button', { name: 'Sungai Sialang' }))
    const kartu = screen.getByRole('region', { name: 'Kartu desa Sungai Sialang' })
    expect(kartu).toHaveTextContent('Kecamatan Teluk Meranti · Aktif')
    expect(kartu).toHaveTextContent('2.812 jiwa')
    expect(kartu).toHaveTextContent('63,2%')
    expect(within(kartu).getByRole('link', { name: 'Buka website desa' })).toHaveAttribute('href', 'http://sungaisialang.sinfodes.localhost:3000/')
    await user.click(within(daftar).getByRole('button', { name: 'Tanjung Lamo' }))
    const tl = screen.getByRole('region', { name: 'Kartu desa Tanjung Lamo' })
    expect(tl).toHaveTextContent('Belum ada APBDes tahun ini')
    expect(within(tl).queryByRole('link', { name: 'Buka website desa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'klik Sungai Sialang di peta' }))
    expect(screen.getByRole('region', { name: 'Kartu desa Sungai Sialang' })).toBeInTheDocument()
  })
  it('peta gagal: banner menunjuk ke daftar desa', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'peta gagal' }))
    expect(screen.getByText('Peta tidak bisa ditampilkan di perangkat ini. Daftar desa di bawah tetap bisa dipakai.')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Daftar desa di peta' })).toBeInTheDocument()
  })
  it('lapisan Tingkatan Indeks: lima kelas, periodenya tertulis, desa Persiapan di kelas kosong (7C-1)', async () => {
    const user = pasang()
    await screen.findByText(/^32 titik/)
    await user.click(screen.getByRole('radio', { name: 'Tingkatan Indeks' }))
    const legenda = screen.getByRole('list', { name: 'Keterangan warna' })
    expect(within(legenda).getAllByRole('listitem').map((l) => l.textContent?.replace(/\s\(\d+\)$/, ''))).toEqual([
      'Rintisan', 'Berkembang', 'Maju', 'Mandiri Digital', 'Belum ada Indeks',
    ])
    expect(screen.getByText('Tingkatan Indeks · Agustus 2026')).toBeInTheDocument()
    const daftar = screen.getByRole('table', { name: 'Daftar desa di peta' })
    const persiapan = within(daftar).getAllByRole('row').filter((r) => /Panduk Baru|Tanjung Lamo|Ogung Jaya/.test(r.textContent ?? ''))
    expect(persiapan.length).toBeGreaterThan(0)
    for (const r of persiapan) expect(r).toHaveTextContent('Belum ada Indeks')
  })
})
