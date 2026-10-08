import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PenampungToast } from '../toast/PenampungToast'
import { Nik } from './Nik'
import { NikField } from './NikField'
import { Rupiah } from './Rupiah'
import { Tanggal } from './Tanggal'

const HARI_INI = new Date('2026-09-24T02:30:00Z')

function NikFieldUji() {
  const [nilai, setNilai] = useState('')
  return <NikField nilai={nilai} onUbah={(digit) => setNilai(digit)} hariIni={HARI_INI} />
}

describe('Nik', () => {
  it('ditampilkan per makna, dengan arti di tooltip', () => {
    render(<Nik nik="1405095203918002" />)
    expect(screen.getByText('140509')).toBeInTheDocument()
    expect(screen.getByText('520391')).toBeInTheDocument()
    expect(screen.getByTitle(/Lahir 12-03-1991 · Perempuan/)).toBeInTheDocument()
  })
  it('bayi tanpa NIK memakai cap', () => {
    render(<Nik nik={null} />)
    expect(screen.getByText('Belum ada NIK')).toBeInTheDocument()
  })
  it('tombol salin menyalin 16 digit tanpa spasi', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Nik nik="1405095203918002" salin />
        <PenampungToast />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Salin NIK' }))
    expect(await navigator.clipboard.readText()).toBe('1405095203918002')
    expect(await screen.findByText('NIK disalin')).toBeInTheDocument()
  })
})

describe('NikField', () => {
  it('mengelompokkan angka saat diketik dan membaca maknanya', async () => {
    render(<NikFieldUji />)
    await userEvent.type(screen.getByLabelText('NIK'), '1405095203918002')
    expect(screen.getByLabelText('NIK')).toHaveValue('140509 520391 8002')
    expect(screen.getByText('Perempuan · lahir 12 Mar 1991 · terdaftar di Teluk Meranti, Pelalawan')).toBeInTheDocument()
  })
  it('tempelan dengan spasi, titik, dan strip dibersihkan', async () => {
    render(<NikFieldUji />)
    await userEvent.click(screen.getByLabelText('NIK'))
    await userEvent.paste('1405 0952.0391-8002')
    expect(screen.getByLabelText('NIK')).toHaveValue('140509 520391 8002')
  })
  it('NIK yang belum lengkap baru ditandai setelah kolom ditinggalkan', async () => {
    render(<NikFieldUji />)
    await userEvent.type(screen.getByLabelText('NIK'), '140509520391800')
    expect(screen.queryByText('NIK harus 16 angka — baru 15')).not.toBeInTheDocument()
    await userEvent.tab()
    expect(screen.getByText('NIK harus 16 angka — baru 15')).toBeInTheDocument()
  })
})

describe('Rupiah dan Tanggal', () => {
  it('Rupiah lengkap', () => {
    render(<Rupiah nilai={1250000} />)
    expect(screen.getByText('Rp1.250.000')).toBeInTheDocument()
  })
  it('Rupiah ringkas dengan nilai lengkap di tooltip', () => {
    render(<Rupiah nilai={1826650000} ringkas />)
    expect(screen.getByText('Rp1,83 M')).toHaveAttribute('title', 'Rp1.826.650.000')
  })
  it('Tanggal memakai elemen time', () => {
    render(<Tanggal iso="2026-08-05" />)
    expect(screen.getByText('5 Agu 2026')).toHaveAttribute('datetime', '2026-08-05')
  })
  it('Tanggal relatif', () => {
    render(<Tanggal iso="2026-09-23T16:00:00+07:00" gaya="relatif" sekarang={HARI_INI} />)
    expect(screen.getByText('Kemarin')).toBeInTheDocument()
  })
})
