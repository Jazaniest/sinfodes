import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AKSEN_WEBSITE, MOTIF_WEBSITE } from '@/domain/website/schema'
import { rasioKontras } from '../kontras'
import { warna } from '../tokens'
import { POLA_MOTIF } from './motif'
import { Nameplate } from './Nameplate'

const DASAR = { nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', tanggal: 'Kamis, 24 September 2026' }

describe('Nameplate website desa (SPEC §9)', () => {
  it('nama desa, wilayah, tanggal, dan pita motif berwarna aksen; tanpa logo memakai monogram', () => {
    const { container } = render(<Nameplate {...DASAR} aksen="#2F5D3A" motif="siku-keluang" logo={null} />)
    expect(screen.getByText('Sungai Sialang')).toBeInTheDocument()
    expect(screen.getByText('Desa · Kecamatan Teluk Meranti · Kabupaten Pelalawan')).toBeInTheDocument()
    expect(screen.getByText('Kamis, 24 September 2026')).toBeInTheDocument()
    expect(container.querySelector('svg[data-motif="siku-keluang"] path')).toHaveAttribute('fill', '#2F5D3A')
    expect(container.querySelector('img')).toBeNull()
  })
  it('logo yang diunggah dipakai', () => {
    const logo = `data:image/png;base64,${'A'.repeat(64)}`
    const { container } = render(<Nameplate {...DASAR} aksen="#1F4E79" motif="garis" logo={logo} />)
    expect(container.querySelector('img')).toHaveAttribute('src', logo)
  })
  it('setiap motif punya pola; setiap aksen lolos kontras dengan teks putih dan sebagai teks di atas lembar', () => {
    for (const m of MOTIF_WEBSITE) expect(POLA_MOTIF[m].jalur).toMatch(/^M/)
    for (const { hex } of Object.values(AKSEN_WEBSITE)) {
      expect(rasioKontras(hex, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
      expect(rasioKontras(hex, warna.lembar)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
