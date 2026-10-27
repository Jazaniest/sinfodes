import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Cap } from './cap/Cap'
import { Hitungan } from './hitungan/Hitungan'
import { Tombol } from './tombol/Tombol'
import { Banner } from './umpan-balik/Banner'
import { EmptyState } from './umpan-balik/EmptyState'
import { ErrorState } from './umpan-balik/ErrorState'
import { BarisKerangka } from './umpan-balik/Skeleton'

describe('Tombol', () => {
  it('memanggil onPress', async () => {
    const onPress = vi.fn()
    render(<Tombol onPress={onPress}>Simpan</Tombol>)
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onPress).toHaveBeenCalledOnce()
  })
  it('tidak bisa ditekan saat memuat', async () => {
    const onPress = vi.fn()
    render(
      <Tombol memuat onPress={onPress}>
        Simpan
      </Tombol>,
    )
    const tombol = screen.getByRole('button', { name: /Simpan/ })
    await userEvent.click(tombol)
    expect(onPress).not.toHaveBeenCalled()
    expect(tombol).toHaveAttribute('data-pending')
  })
})

describe('Cap dan Hitungan', () => {
  it('Cap menampilkan label bawaan varian', () => {
    render(<Cap varian="perlu-ttd" />)
    expect(screen.getByText('Perlu TTD')).toHaveAttribute('data-varian', 'perlu-ttd')
  })
  it('Cap dengan label khusus', () => {
    render(<Cap varian="selesai" label="Terbit" />)
    expect(screen.getByText('Terbit')).toBeInTheDocument()
  })
  it('Hitungan memakai pemisah ribuan dan keterangan untuk pembaca layar', () => {
    render(<Hitungan nilai={2812} label="jiwa" />)
    expect(screen.getByText('2.812')).toBeInTheDocument()
    expect(screen.getByText('jiwa')).toHaveClass('sr-only')
  })
})

describe('tampilan keadaan', () => {
  it('BarisKerangka mengumumkan sedang memuat', () => {
    render(<BarisKerangka jumlah={3} />)
    expect(screen.getByRole('status')).toHaveTextContent('Memuat data…')
  })
  it('EmptyState menampilkan judul dan satu aksi', () => {
    render(
      <EmptyState
        judul="Belum ada data penduduk"
        keterangan="Impor dari Excel atau tambah satu per satu."
        aksi={<Tombol>Impor dari Excel</Tombol>}
      />,
    )
    expect(screen.getByText('Belum ada data penduduk')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Impor dari Excel' })).toBeInTheDocument()
  })
  it('ErrorState menjelaskan galat dan menyediakan Coba lagi', async () => {
    const onCobaLagi = vi.fn()
    render(<ErrorState pesan="Server sedang tidak dapat dihubungi." onCobaLagi={onCobaLagi} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server sedang tidak dapat dihubungi.')
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(onCobaLagi).toHaveBeenCalledOnce()
  })
  it('Banner galat berperan alert, nada lain berperan status', () => {
    render(
      <>
        <Banner nada="galat">NIK sudah terdaftar</Banner>
        <Banner nada="info">Draf dipulihkan</Banner>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('NIK sudah terdaftar')
    expect(screen.getByRole('status')).toHaveTextContent('Draf dipulihkan')
  })
  it('Banner dengan aksi: di wadah sempit (HP warga) aksi turun ke bawah teks, di wadah lebar di sampingnya', () => {
    render(
      <Banner judul="Melanjutkan isian yang tersimpan di HP ini" aksi={<Tombol varian="teks">Mulai dari awal</Tombol>}>
        Isian Anda masih ada.
      </Banner>,
    )
    expect(screen.getByRole('status')).toHaveClass('@container')
    const kolom = screen.getByRole('button', { name: 'Mulai dari awal' }).parentElement?.parentElement
    expect(kolom).toHaveClass('flex-col', '@md:flex-row')
    expect(kolom).toHaveTextContent('Isian Anda masih ada.')
  })
})
