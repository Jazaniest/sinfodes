import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { kosongkanToast, tampilkanToast } from './antrean'
import { PenampungToast } from './PenampungToast'

afterEach(() => {
  act(() => kosongkanToast())
  vi.useRealTimers()
})

describe('toast', () => {
  it('menampilkan pesan sebagai status', () => {
    render(<PenampungToast />)
    act(() => {
      tampilkanToast({ pesan: 'NIK disalin', nada: 'berhasil' })
    })
    expect(screen.getByRole('status')).toHaveTextContent('NIK disalin')
  })
  it('toast galat berperan alert', () => {
    render(<PenampungToast />)
    act(() => {
      tampilkanToast({ pesan: 'Gagal menyimpan', nada: 'galat' })
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal menyimpan')
  })
  it('hilang sendiri setelah durasi', () => {
    vi.useFakeTimers()
    render(<PenampungToast durasi={1000} />)
    act(() => {
      tampilkanToast({ pesan: 'Tersimpan' })
    })
    expect(screen.getByText('Tersimpan')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByText('Tersimpan')).not.toBeInTheDocument()
  })
  it('aksi dijalankan lalu toast ditutup', async () => {
    const onPress = vi.fn()
    render(<PenampungToast />)
    act(() => {
      tampilkanToast({ pesan: 'Surat diterbitkan', nada: 'berhasil', aksi: { label: 'Cetak', onPress } })
    })
    await userEvent.click(screen.getByRole('button', { name: 'Cetak' }))
    expect(onPress).toHaveBeenCalledOnce()
    expect(screen.queryByText('Surat diterbitkan')).not.toBeInTheDocument()
  })
  it('paling banyak 3 toast; yang paling lama keluar', () => {
    render(<PenampungToast />)
    act(() => {
      for (const n of ['1', '2', '3', '4']) tampilkanToast({ pesan: `Toast ${n}` })
    })
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(3)
  })
})
