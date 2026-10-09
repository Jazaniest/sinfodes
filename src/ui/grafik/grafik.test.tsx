import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarChart } from './BarChart'
import { PyramidChart } from './PyramidChart'

describe('BarChart (SPEC §4.4, §6.7)', () => {
  it('batang bertujuan adalah tautan bernama lengkap; panjang batang sebanding', () => {
    render(
      <BarChart
        label="Agama"
        batang={[
          { id: 'Islam', label: 'Islam', nilai: 2620, href: '/admin/kependudukan/penduduk?agama=Islam' },
          { id: 'Kristen', label: 'Kristen', nilai: 1310, href: '/admin/kependudukan/penduduk?agama=Kristen' },
          { id: 'kosong', label: 'Belum diisi', nilai: 0, href: null },
        ]}
      />,
    )
    const daftar = screen.getByRole('list', { name: 'Agama' })
    expect(within(daftar).getByRole('link', { name: 'Islam: 2.620 jiwa. Buka daftar penduduk' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk?agama=Islam',
    )
    expect(within(daftar).getAllByRole('link')).toHaveLength(2)
    expect(within(daftar).getByText('Belum diisi')).toBeInTheDocument()
    const lebar = [...daftar.querySelectorAll<HTMLElement>('[data-batang]')].map((b) => b.style.width)
    expect(lebar).toEqual(['100%', '50%', '0%'])
  })
})

describe('PyramidChart', () => {
  it('kelompok tertua di atas; tiap sisi tautan ke daftar terfilter', () => {
    render(
      <PyramidChart
        label="Piramida penduduk"
        baris={[
          { id: '0–4', label: '0–4', laki: 100, perempuan: 90, hrefLaki: '/l04', hrefPerempuan: '/p04' },
          { id: '75+', label: '75+', laki: 20, perempuan: 30, hrefLaki: '/l75', hrefPerempuan: '/p75' },
        ]}
      />,
    )
    const baris = within(screen.getByRole('list', { name: 'Piramida penduduk' })).getAllByRole('listitem')
    expect(baris[0]).toHaveTextContent('75+')
    expect(screen.getByRole('link', { name: '75+ tahun, perempuan: 30 jiwa. Buka daftar penduduk' })).toHaveAttribute('href', '/p75')
    expect(screen.getByRole('link', { name: '0–4 tahun, laki-laki: 100 jiwa. Buka daftar penduduk' })).toHaveAttribute('href', '/l04')
  })
})
