import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ID_MOTIF } from '@/domain/website/motif'
import { FotoWarta } from './FotoWarta'
import { CapLencana } from './Lencana'
import { POLA_MOTIF } from './motif'
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
  it('FotoWarta kecil tanpa keterangan: lebar dari pemanggil saja, tanpa w-full yang bentrok (fokus review 5)', () => {
    const { container } = render(<FotoWarta berkas="/demo/foto/posyandu.jpg" alt="" rasio="foto" className="w-24 shrink-0" />)
    const img = container.querySelector('img')
    expect(img).toHaveClass('w-24', 'shrink-0')
    expect(img).not.toHaveClass('w-full')
  })
  it('Rubrik: wilayah bernama judulnya, dengan id sebagai jangkar', () => {
    render(
      <Rubrik id="posyandu" judul="Jadwal posyandu">
        <p>Isi</p>
      </Rubrik>,
    )
    expect(screen.getByRole('region', { name: 'Jadwal posyandu' })).toHaveAttribute('id', 'posyandu')
  })
  it('CapLencana: tautan ke bukti dengan aria-label lengkap, angka peringkat, kategori, wilayah, dan periode', () => {
    render(
      <CapLencana
        lencana={{
          kode: 'LJ-ABCDEFGH',
          kalimat: 'Juara 1 bersama Layanan Tercepat · Kabupaten Pelalawan · Agustus 2026',
          peringkat: 1,
          bersama: true,
          kategori: 'layanan',
          tingkat: 'kabupaten',
          periode: { musim: 'bulanan', kode: '2026-08', label: 'Agustus 2026' },
        }}
        href="http://sinfodes.localhost/lencana/LJ-ABCDEFGH"
        varian="bukti"
      />,
    )
    const cap = screen.getByRole('link', { name: 'Juara 1 bersama Layanan Tercepat · Kabupaten Pelalawan · Agustus 2026, buka bukti lencana' })
    expect(cap).toHaveAttribute('href', 'http://sinfodes.localhost/lencana/LJ-ABCDEFGH')
    expect(cap).toHaveTextContent('Layanan Tercepat')
    expect(cap).toHaveTextContent('Kabupaten Pelalawan · Agustus 2026')
    expect(cap).toHaveClass('text-stempel')
  })
  it('setiap motif punya ubin dengan ukuran dan jalur tidak kosong', () => {
    expect(Object.keys(POLA_MOTIF).sort()).toEqual([...ID_MOTIF].sort())
    for (const m of ID_MOTIF) {
      const pola = POLA_MOTIF[m]
      expect(pola.lebar, m).toBeGreaterThan(0)
      expect(pola.tinggi, m).toBeGreaterThan(0)
      expect(pola.jalur, m).toMatch(/^M.+Z$/)
    }
  })
})
