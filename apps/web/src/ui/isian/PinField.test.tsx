import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PinField } from './PinField'

function PinTerkendali({ galat }: { galat?: string }) {
  const [nilai, setNilai] = useState('')
  return <PinField nilai={nilai} onUbah={setNilai} galat={galat} keterangan="PIN 6 angka dari kantor desa." />
}

describe('PinField (SPEC §4.4, §10)', () => {
  it('hanya angka, paling banyak 6, dan angkanya tidak tampil', async () => {
    render(<PinTerkendali />)
    const input = screen.getByLabelText('PIN')
    await userEvent.setup().type(input, '12a3456789')
    expect(input).toHaveValue('123456')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getAllByText('•')).toHaveLength(6)
    expect(screen.getByText('PIN 6 angka dari kantor desa.')).toBeInTheDocument()
  })
  it('PIN yang ditempel dengan spasi tetap terbaca', async () => {
    render(<PinTerkendali />)
    const input = screen.getByLabelText('PIN')
    const user = userEvent.setup()
    await user.click(input)
    await user.paste('246 810')
    expect(input).toHaveValue('246810')
  })
  it('saat difokus, kotak berikutnya bertepi biru saja (kelas tepi tidak bentrok)', async () => {
    render(<PinTerkendali />)
    const input = screen.getByLabelText('PIN')
    const user = userEvent.setup()
    await user.click(input)
    await user.keyboard('12')
    const kotak = input.parentElement?.firstElementChild?.children[2]
    expect(kotak).toHaveClass('border-biru')
    expect(kotak).not.toHaveClass('border-garis-input')
  })
  it('galat dibacakan dan kolom ditandai tidak valid', () => {
    render(<PinTerkendali galat="NIK atau PIN salah." />)
    expect(screen.getByLabelText('PIN')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('NIK atau PIN salah.')).toBeInTheDocument()
  })
})
