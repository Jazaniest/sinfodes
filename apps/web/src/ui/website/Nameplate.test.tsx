import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ID_MOTIF } from '@/domain/website/motif'
import { Nameplate } from './Nameplate'

const DASAR = { nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', tanggal: 'Kamis, 24 September 2026' }

describe('Nameplate website desa (SPEC §9, rencana 7E-1)', () => {
  it('nama desa, wilayah, tanggal, dan pita motif; tanpa logo memakai monogram', () => {
    const { container } = render(<Nameplate {...DASAR} motif="siku-keluang" logo={null} />)
    expect(screen.getByText('Sungai Sialang')).toBeInTheDocument()
    expect(screen.getByText('Desa · Kecamatan Teluk Meranti · Kabupaten Pelalawan')).toBeInTheDocument()
    expect(screen.getByText('Kamis, 24 September 2026')).toBeInTheDocument()
    expect(container.querySelector('svg[data-motif="siku-keluang"]')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })
  it('warna pita dan nama desa dari variabel kontrak, bukan prop hex', () => {
    const { container } = render(<Nameplate {...DASAR} motif="garis" logo={null} />)
    expect((container.querySelector('svg[data-motif="garis"] path') as SVGPathElement).style.fill).toBe('var(--desa-warna-aksen)')
    expect(screen.getByText('Sungai Sialang')).toHaveClass('text-biru')
  })
  it('logo yang diunggah dipakai', () => {
    const logo = `data:image/png;base64,${'A'.repeat(64)}`
    const { container } = render(<Nameplate {...DASAR} motif="garis" logo={logo} />)
    expect(container.querySelector('img')).toHaveAttribute('src', logo)
  })
  it('semua motif dapat dirender sebagai pita', () => {
    for (const m of ID_MOTIF) {
      const { container, unmount } = render(<Nameplate {...DASAR} motif={m} logo={null} />)
      expect(container.querySelector(`svg[data-motif="${m}"] pattern path`), m).not.toBeNull()
      unmount()
    }
  })
  it('tiga bentuk kepala (7E-2): nama desa sama, wilayah sama, dan data-bagian kepala', () => {
    for (const bentuk of ['warta', 'ringkas', 'pita'] as const) {
      const { container, unmount } = render(<Nameplate {...DASAR} motif="garis" logo={null} bentuk={bentuk} />)
      expect(screen.getByText('Sungai Sialang'), bentuk).toHaveClass('font-serif')
      expect(screen.getByText(/Kecamatan Teluk Meranti · Kabupaten Pelalawan/), bentuk).toBeInTheDocument()
      expect(container.querySelector('header[data-bagian="kepala"]'), bentuk).not.toBeNull()
      expect(container.querySelector('header')?.getAttribute('data-bentuk'), bentuk).toBe(bentuk)
      unmount()
    }
  })
  it('bentuk pita: nama putih di atas warna utama; motif menjadi pemisah di bawahnya', () => {
    const { container } = render(<Nameplate {...DASAR} motif="tumpal" logo={null} bentuk="pita" />)
    expect(screen.getByText('Sungai Sialang')).toHaveClass('text-putih')
    const pita = container.querySelector('[data-pita]') as HTMLElement
    expect(pita).toHaveClass('bg-biru')
    expect(pita.querySelector('svg[data-motif]')).toBeNull()
    expect(container.querySelector('svg[data-motif="tumpal"]')).not.toBeNull()
    expect(pita.compareDocumentPosition(container.querySelector('svg[data-motif="tumpal"]') as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('bentuk ringkas: logo dan nama dalam satu baris, menu ikut di dalam kepala; motif garis tipis di bawah', () => {
    const { container } = render(
      <Nameplate {...DASAR} motif="garis" logo={null} bentuk="ringkas" menu={<nav aria-label="Menu uji">menu</nav>} />,
    )
    const kepala = container.querySelector('header') as HTMLElement
    expect(kepala.querySelector('nav[aria-label="Menu uji"]')).not.toBeNull()
    expect(screen.queryByText('Kamis, 24 September 2026')).toBeInTheDocument()
    expect((kepala.querySelector('svg[data-motif="garis"]') as SVGElement).style.height).toBe('6px')
  })
  it('bentuk warta dan pita: menu dirender setelah kepala, bukan di dalamnya', () => {
    for (const bentuk of ['warta', 'pita'] as const) {
      const { container, unmount } = render(<Nameplate {...DASAR} motif="garis" logo={null} bentuk={bentuk} menu={<nav aria-label="Menu uji">menu</nav>} />)
      expect(container.querySelector('header nav'), bentuk).toBeNull()
      expect(container.querySelector('nav[aria-label="Menu uji"]'), bentuk).not.toBeNull()
      unmount()
    }
  })
})
