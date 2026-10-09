import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fokusIsianSalah } from '../hooks/fokus-isian'
import { TextField } from '../isian/TextField'
import { Tombol } from '../tombol/Tombol'
import { BagianIsian, FormulirBagian } from './FormulirBagian'

const BAGIAN = [
  { id: 'identitas', judul: 'Identitas' },
  { id: 'kelahiran', judul: 'Kelahiran' },
]

function Contoh() {
  return (
    <FormulirBagian label="Formulir penduduk" bagian={BAGIAN} aksi={<Tombol type="submit">Simpan</Tombol>}>
      <BagianIsian id="identitas" nomor={1} judul="Identitas">
        <TextField label="Nama lengkap" />
      </BagianIsian>
      <BagianIsian id="kelahiran" nomor={2} judul="Kelahiran">
        <TextField label="Tempat lahir" galat="Tempat lahir wajib diisi" />
      </BagianIsian>
    </FormulirBagian>
  )
}

describe('FormulirBagian (SPEC §6.4)', () => {
  it('indeks bagian menggulir ke bagiannya tanpa mengubah URL', async () => {
    const gulir = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<Contoh />)
    const indeks = screen.getByRole('navigation', { name: 'Bagian formulir penduduk' })
    expect(indeks).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: '2. Kelahiran' }))
    expect(gulir).toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    expect(screen.getByRole('region', { name: /Kelahiran/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument()
    gulir.mockRestore()
  })
  it('fokusIsianSalah memindahkan fokus ke isian bergalat pertama', async () => {
    const { container } = render(<Contoh />)
    fokusIsianSalah(container)
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tempat lahir' })).toHaveFocus())
  })
  it('menandai <html> selama terpasang, supaya toast naik di atas bilah aksi', () => {
    const { unmount } = render(<Contoh />)
    expect(document.documentElement).toHaveAttribute('data-bilah-aksi')
    unmount()
    expect(document.documentElement).not.toHaveAttribute('data-bilah-aksi')
  })
})
