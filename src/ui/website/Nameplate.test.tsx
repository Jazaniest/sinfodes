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
})
