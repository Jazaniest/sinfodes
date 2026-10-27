import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'
import { NumberField } from './NumberField'
import { RadioGroup } from './RadioGroup'
import { TextArea } from './TextArea'
import { TimeField } from './TimeField'

describe('DatePicker (SPEC §4.4: ketik DD/MM/YYYY atau pilih kalender)', () => {
  it('urutan hari/bulan/tahun dengan nol di depan', () => {
    render(<DatePicker label="Tanggal lahir" nilai="2026-09-04" onUbah={() => {}} />)
    const [hari, bulan, tahun] = screen.getAllByRole('spinbutton')
    expect(hari).toHaveTextContent('04')
    expect(bulan).toHaveTextContent('09')
    expect(tahun).toHaveTextContent('2026')
  })
  it('mengetik tanggal menghasilkan ISO YYYY-MM-DD', async () => {
    const onUbah = vi.fn()
    function Uji() {
      const [nilai, setNilai] = useState<string | null>(null)
      return (
        <DatePicker
          label="Tanggal lahir"
          nilai={nilai}
          onUbah={(v) => {
            setNilai(v)
            onUbah(v)
          }}
        />
      )
    }
    render(<Uji />)
    await userEvent.click(screen.getAllByRole('spinbutton')[0])
    await userEvent.keyboard('12031991')
    expect(onUbah).toHaveBeenLastCalledWith('1991-03-12')
  })
  it('punya tombol kalender berlabel dan menampilkan galat', () => {
    render(<DatePicker label="Tanggal lahir" nilai={null} onUbah={() => {}} galat="Tanggal lahir wajib diisi" />)
    expect(screen.getByRole('button', { name: /Buka kalender/ })).toBeInTheDocument()
    expect(screen.getByText('Tanggal lahir wajib diisi')).toBeInTheDocument()
  })
})

describe('TimeField', () => {
  it('nilai awal tampil sebagai jam dan menit 24 jam', () => {
    render(<TimeField label="Jam lahir" nilai="04:15" onUbah={() => {}} />)
    const [jam, menit] = screen.getAllByRole('spinbutton')
    expect(jam).toHaveTextContent('04')
    expect(menit).toHaveTextContent('15')
  })
  it('mengetik jam menghasilkan "HH:mm"', async () => {
    const onUbah = vi.fn()
    function Uji() {
      const [nilai, setNilai] = useState<string | null>(null)
      return (
        <TimeField
          label="Jam meninggal"
          nilai={nilai}
          onUbah={(v) => {
            setNilai(v)
            onUbah(v)
          }}
        />
      )
    }
    render(<Uji />)
    await userEvent.click(screen.getAllByRole('spinbutton')[0])
    await userEvent.keyboard('2140')
    expect(onUbah).toHaveBeenLastCalledWith('21:40')
  })
})

describe('NumberField', () => {
  it('angka dengan titik ribuan dan satuan; kosong berarti null', async () => {
    const onUbah = vi.fn()
    function Uji() {
      const [nilai, setNilai] = useState<number | null>(null)
      return (
        <NumberField
          label="Berat"
          satuan="gram"
          nilai={nilai}
          onUbah={(v) => {
            setNilai(v)
            onUbah(v)
          }}
        />
      )
    }
    render(<Uji />)
    const isian = screen.getByRole('textbox', { name: 'Berat' })
    await userEvent.click(isian)
    await userEvent.keyboard('3100')
    await userEvent.tab()
    expect(onUbah).toHaveBeenLastCalledWith(3100)
    expect(isian).toHaveValue('3.100')
    expect(screen.getByText('gram')).toBeInTheDocument()
    await userEvent.clear(isian)
    await userEvent.tab()
    expect(onUbah).toHaveBeenLastCalledWith(null)
  })
})

describe('RadioGroup', () => {
  it('semua pilihan terlihat; memilih memanggil onUbah', async () => {
    const onUbah = vi.fn()
    const pilihan = [
      { id: 'L', label: 'Laki-laki' },
      { id: 'P', label: 'Perempuan' },
    ]
    render(<RadioGroup label="Jenis kelamin" pilihan={pilihan} nilai={null} onUbah={onUbah} galat="Pilih jenis kelamin" />)
    expect(screen.getByRole('radiogroup', { name: 'Jenis kelamin' })).toBeInTheDocument()
    expect(screen.getByText('Pilih jenis kelamin')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Perempuan' }))
    expect(onUbah).toHaveBeenCalledWith('P')
  })
})

describe('TextArea', () => {
  it('label selalu tampil dan isian bisa diketik', async () => {
    const onChange = vi.fn()
    render(<TextArea label="Catatan" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Catatan' }), 'Pindahan')
    expect(onChange).toHaveBeenLastCalledWith('Pindahan')
  })
})
