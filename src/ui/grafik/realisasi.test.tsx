import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LineChart } from './LineChart'
import { MiniBar } from './MiniBar'
import { maksRapi } from './skala'

describe('MiniBar (SPEC §4.4)', () => {
  it('persentase tertulis dan terbaca sebagai meter', () => {
    render(<MiniBar label="Belanja" nilai={63} maks={100} keterangan="Rp63 dari Rp100" />)
    const meter = screen.getByRole('meter', { name: 'Belanja' })
    expect(meter).toHaveAttribute('aria-valuetext', '63,0%')
    expect(screen.getByText('63,0%')).toBeInTheDocument()
    expect(screen.getByText('Rp63 dari Rp100')).toBeInTheDocument()
  })
  it('anggaran 0 tampil 0%, bukan NaN; nilai di atas maksimum tertulis apa adanya, batangnya berhenti di 100% (fokus review 3)', () => {
    const { container, rerender } = render(<MiniBar label="Pelantar" nilai={0} maks={0} />)
    expect(screen.getByText('0,0%')).toBeInTheDocument()
    expect(container.querySelector('[role="meter"] > div')).toHaveStyle({ width: '0%' })
    rerender(<MiniBar label="Pelantar" nilai={150} maks={100} />)
    expect(screen.getByText('150,0%')).toBeInTheDocument()
    expect(container.querySelector('[role="meter"] > div')).toHaveStyle({ width: '100%' })
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
  })
  it('label tersembunyi berpatokan pada MiniBar sendiri, supaya tidak meluber keluar bingkai gulir tabel di layar sempit', () => {
    render(<MiniBar label="Dana Desa" nilai={75} maks={100} labelTersembunyi />)
    const label = screen.getByText('Dana Desa')
    expect(label).toHaveClass('sr-only')
    // sr-only memakai position: absolute; tanpa leluhur `relative` di dalam bingkai gulir, label ini melebarkan halaman.
    expect(label.closest('.relative')).toBe(screen.getByRole('meter').parentElement)
  })
})

describe('LineChart', () => {
  const pasang = () =>
    render(
      <LineChart
        label="Realisasi kumulatif per bulan"
        judulSumbuX="Bulan"
        sumbuX={['Jan', 'Feb', 'Mar']}
        seri={[
          { id: 'pendapatan', label: 'Pendapatan', nilai: [10, 30, 60] },
          { id: 'belanja', label: 'Belanja', nilai: [5, 20, 20] },
        ]}
        format={(n) => `${n} rb`}
      />,
    )
  it('legenda dengan nilai terakhir, dan garis kedua putus-putus', () => {
    const { container } = pasang()
    const grafik = screen.getByRole('figure', { name: 'Realisasi kumulatif per bulan' })
    expect(within(grafik).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Pendapatan: 60 rb', 'Belanja: 20 rb'])
    const garis = container.querySelectorAll('polyline')
    expect(garis).toHaveLength(2)
    expect(garis[0]).not.toHaveAttribute('stroke-dasharray')
    expect(garis[1]).toHaveAttribute('stroke-dasharray')
  })
  it('tabel nilai untuk pembaca layar', () => {
    pasang()
    const tabel = screen.getByRole('table', { name: 'Realisasi kumulatif per bulan' })
    const baris = within(tabel).getAllByRole('row')
    expect(baris).toHaveLength(4)
    expect(baris[3]).toHaveTextContent('Mar60 rb20 rb')
  })
  it('batas atas sumbu yang rapi', () => {
    expect(maksRapi(1_315_800_000)).toBe(2_000_000_000)
    expect(maksRapi(250)).toBe(250)
    expect(maksRapi(251)).toBe(500)
    expect(maksRapi(0)).toBe(1)
  })
})
