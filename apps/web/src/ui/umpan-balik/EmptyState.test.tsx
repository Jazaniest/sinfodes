import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState (SPEC §4.4)', () => {
  it('keadaan kosong biasa: judul berupa teks, bukan heading', () => {
    render(<EmptyState judul="Belum ada kegiatan" />)
    expect(screen.getByText('Belum ada kegiatan').tagName).toBe('P')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
  it('judulHalaman: judul menjadi h1 dengan gaya yang sama (fokus review 4)', () => {
    render(<EmptyState judul="Desa tidak ditemukan" judulHalaman />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Desa tidak ditemukan' })
    expect(h1).toHaveClass('font-serif', 'text-judul-bagian', 'font-medium')
  })
})
