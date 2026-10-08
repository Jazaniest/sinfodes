import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChipFilter } from '../data/ChipFilter'
import { DescriptionList } from '../data/DescriptionList'
import { Timeline } from '../data/Timeline'
import { LambangDesa } from '../domain/LambangDesa'
import { PageHeader } from './PageHeader'

describe('PageHeader (SPEC §5.2)', () => {
  it('jejak, judul, meta, aksi, dan tab', () => {
    render(
      <PageHeader
        jejak={[{ label: 'Kependudukan', href: '/admin/kependudukan/penduduk' }, { label: 'Penduduk' }]}
        judul="Siti Rahmah"
        meta="2.812 jiwa"
        aksi={<button type="button">Aksi</button>}
        tab={<nav aria-label="Tab uji" />}
      />,
    )
    const jejak = screen.getByRole('navigation', { name: 'Jejak halaman' })
    expect(within(jejak).getByRole('link', { name: 'Kependudukan' })).toHaveAttribute('href', '/admin/kependudukan/penduduk')
    expect(within(jejak).getByText('Penduduk')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.getByText('2.812 jiwa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aksi' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Tab uji' })).toBeInTheDocument()
  })
})

describe('DescriptionList', () => {
  it('label dan nilai; nilai kosong ditulis "Belum diisi"', () => {
    render(<DescriptionList judul="Pekerjaan" items={[{ label: 'Pendidikan', nilai: 'SLTA/Sederajat' }, { label: 'Pekerjaan', nilai: null }]} />)
    expect(screen.getByRole('heading', { name: 'Pekerjaan' })).toBeInTheDocument()
    const nilai = screen.getAllByRole('definition').map((d) => d.textContent)
    expect(nilai).toEqual(['SLTA/Sederajat', 'Belum diisi'])
  })
})

describe('Timeline', () => {
  it('daftar berurutan dengan waktu dan judul', () => {
    render(
      <Timeline
        label="Riwayat"
        entri={[
          { id: '1', waktu: '24 Sep 2026 · pukul 09.12 WIB', judul: 'Pekerjaan: Pelajar/Mahasiswa → Karyawan Swasta', keterangan: 'Rosmiati' },
          { id: '2', waktu: '1 Feb 2024', judul: 'Data dibuat' },
        ]}
      />,
    )
    const daftar = screen.getByRole('list', { name: 'Riwayat' })
    expect(within(daftar).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Rosmiati')).toBeInTheDocument()
  })
})

describe('ChipFilter', () => {
  it('grup radio: memilih chip memanggil onUbah', async () => {
    const onUbah = vi.fn()
    render(
      <ChipFilter
        label="Filter siap pakai"
        pilihan={[{ id: 'semua', label: 'Semua' }, { id: 'balita', label: 'Balita' }]}
        nilai="semua"
        onUbah={onUbah}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Filter siap pakai' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Semua' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Balita' }))
    expect(onUbah).toHaveBeenCalledWith('balita')
  })
})

describe('LambangDesa', () => {
  it('monogram inisial desa, disembunyikan dari pembaca layar', () => {
    const { container } = render(<LambangDesa nama="Sungai Sialang" />)
    expect(container.textContent).toBe('SS')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
