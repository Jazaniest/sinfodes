import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AKSEN_WEBSITE } from '@/domain/website/schema'
import { rasioKontras } from '../kontras'
import { warna } from '../tokens'
import { gayaAksen, turunanAksen } from './aksen'
import { FotoWarta } from './FotoWarta'
import { Rubrik } from './Rubrik'

describe('komponen website desa (SPEC §9)', () => {
  it('FotoWarta: dua ukuran lewat srcset, dimuat bertahap, dengan keterangan dan kredit', () => {
    render(
      <FotoWarta
        berkas="/demo/foto/ombak-bono.jpg"
        alt="Ombak Bono di Teluk Meranti"
        keterangan="Ombak Bono di Teluk Meranti"
        kredit="Domiyanto1977 · CC BY-SA 4.0"
      />,
    )
    const img = screen.getByRole('img', { name: 'Ombak Bono di Teluk Meranti' })
    expect(img).toHaveAttribute('srcset', '/demo/foto/ombak-bono-960.jpg 960w, /demo/foto/ombak-bono.jpg 1280w')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(screen.getByRole('figure')).toHaveTextContent('Ombak Bono di Teluk Meranti · Foto: Domiyanto1977 · CC BY-SA 4.0')
  })
  it('FotoWarta: foto utama dimuat langsung; unggahan desa (bukan foto kurasi) tanpa srcset; tanpa keterangan tanpa figure', () => {
    const { container } = render(<FotoWarta berkas="data:image/png;base64,AAAA" alt="" utama />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).not.toHaveAttribute('srcset')
    expect(container.querySelector('figure')).toBeNull()
  })
  it('Rubrik: wilayah bernama judulnya, dengan id sebagai jangkar', () => {
    render(
      <Rubrik id="posyandu" judul="Jadwal posyandu">
        <p>Isi</p>
      </Rubrik>,
    )
    expect(screen.getByRole('region', { name: 'Jadwal posyandu' })).toHaveAttribute('id', 'posyandu')
  })
  it('aksen: turunan gelap dan pucat setiap aksen tetap lolos kontras 4,5:1 (fokus review 5)', () => {
    for (const { hex } of Object.values(AKSEN_WEBSITE)) {
      const t = turunanAksen(hex)
      expect(rasioKontras(t.tua, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
      expect(rasioKontras(t.utama, t.muda)).toBeGreaterThanOrEqual(4.5)
      expect(rasioKontras(warna.tinta, t.muda)).toBeGreaterThanOrEqual(4.5)
    }
    expect(gayaAksen('#2F5D3A')).toMatchObject({ '--color-biru': '#2F5D3A' })
  })
})
