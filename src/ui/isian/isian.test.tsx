import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'
import { SearchField } from './SearchField'
import { Select, type OpsiPilihan } from './Select'
import { TextField } from './TextField'

describe('TextField', () => {
  it('label terhubung ke kolom dan perubahan diteruskan', async () => {
    const onChange = vi.fn()
    render(<TextField label="Nama lengkap" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Nama lengkap'), 'Siti')
    expect(onChange).toHaveBeenLastCalledWith('Siti')
  })
  it('galat ditampilkan dan kolom ditandai tidak valid', () => {
    render(<TextField label="NIK" galat="NIK sudah terdaftar" />)
    expect(screen.getByLabelText('NIK')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('NIK sudah terdaftar')).toBeInTheDocument()
  })
})

describe('SearchField', () => {
  it('tombol hapus mengosongkan pencarian', async () => {
    render(<SearchField label="Cari penduduk" defaultValue="Siti" />)
    await userEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }))
    expect(screen.getByRole('searchbox', { name: 'Cari penduduk' })).toHaveValue('')
  })
})

describe('Select', () => {
  const DUSUN: OpsiPilihan[] = [
    { id: 'dsn_ss_1', label: 'Dusun I Kampung Tengah' },
    { id: 'dsn_ss_2', label: 'Dusun II Sialang Jaya' },
  ]
  it('memilih salah satu pilihan', async () => {
    const onUbah = vi.fn()
    function Uji() {
      const [nilai, setNilai] = useState<string | null>(null)
      return (
        <Select
          label="Dusun"
          pilihan={DUSUN}
          nilai={nilai}
          onUbah={(id) => {
            setNilai(id)
            onUbah(id)
          }}
        />
      )
    }
    render(<Uji />)
    await userEvent.click(screen.getByRole('button', { name: /Dusun/ }))
    await userEvent.click(screen.getByRole('option', { name: 'Dusun II Sialang Jaya' }))
    expect(onUbah).toHaveBeenCalledWith('dsn_ss_2')
    expect(screen.getByRole('button', { name: /Dusun II Sialang Jaya/ })).toBeInTheDocument()
  })
})

describe('Checkbox', () => {
  it('mencentang', async () => {
    const onChange = vi.fn()
    render(<Checkbox onChange={onChange}>Tampilkan penduduk meninggal</Checkbox>)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tampilkan penduduk meninggal' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
