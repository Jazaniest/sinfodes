import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TabNav } from './TabNav'
import { Tabs } from './Tabs'
import { Tautan } from './Tautan'

describe('Tautan', () => {
  it('tautan biasa dengan href', () => {
    render(<Tautan href="/admin">Kembali ke Beranda</Tautan>)
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/admin')
  })
})

describe('TabNav', () => {
  it('navigasi berlabel; tab aktif ditandai aria-current', () => {
    render(
      <TabNav
        label="Bagian kependudukan"
        items={[
          { label: 'Penduduk', href: '/admin/kependudukan/penduduk', aktif: true },
          { label: 'Keluarga', href: '/admin/kependudukan/keluarga', aktif: false },
        ]}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Bagian kependudukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Penduduk' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Keluarga' })).not.toHaveAttribute('aria-current')
  })
})

describe('Tabs', () => {
  it('berpindah panel', async () => {
    render(
      <Tabs
        label="Kolom samping"
        items={[
          { id: 'riwayat', label: 'Riwayat', isi: <p>Isi riwayat</p> },
          { id: 'catatan', label: 'Catatan', isi: <p>Isi catatan</p> },
        ]}
      />,
    )
    expect(screen.getByText('Isi riwayat')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Catatan' }))
    expect(screen.getByText('Isi catatan')).toBeInTheDocument()
  })
  it('daftar tab yang bisa digeser tidak meluber ke bawah, dan cincin fokusnya tidak terpotong bingkai gulir', () => {
    render(<Tabs label="Lembaga" items={[{ id: 'a', label: 'Perangkat Desa (14)', isi: <p>a</p> }]} />)
    expect(screen.getByRole('tablist')).toHaveClass('overflow-x-auto')
    const tab = screen.getByRole('tab')
    // Margin negatif di dalam wadah overflow menambah 1px gulir tegak; cincin fokus di luar kotak tab terpotong wadahnya.
    expect(tab.className).not.toMatch(/(^|\s)-mb-px(\s|$)/)
    expect(tab).toHaveClass('data-[focus-visible]:-outline-offset-2')
  })
})
