import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TautanTombol } from '../tombol/TautanTombol'
import { ConfirmDialog } from './ConfirmDialog'
import { Dialog } from './Dialog'

describe('Dialog dan ConfirmDialog (SPEC §4.4)', () => {
  it('dialog berjudul; Esc menutup', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog isOpen onOpenChange={onOpenChange} judul="Pecah KK" subjudul="Langkah 1 dari 3">
        <p>Isi</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Pecah KK' })).toBeInTheDocument()
    expect(screen.getByText('Langkah 1 dari 3')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it('konfirmasi: tombol setuju dan batal', async () => {
    const onSetuju = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog isOpen onOpenChange={onOpenChange} judul="Tinggalkan halaman ini?" labelSetuju="Tinggalkan" labelBatal="Tetap di sini" bahaya onSetuju={onSetuju}>
        Perubahan yang belum disimpan akan hilang.
      </ConfirmDialog>,
    )
    expect(screen.getByRole('alertdialog', { name: 'Tinggalkan halaman ini?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tinggalkan' }))
    expect(onSetuju).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Tetap di sini' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it('TautanTombol adalah tautan, bukan tombol', () => {
    render(<TautanTombol href="/admin/kependudukan/penduduk/tambah">Tambah penduduk</TautanTombol>)
    expect(screen.getByRole('link', { name: 'Tambah penduduk' })).toHaveAttribute('href', '/admin/kependudukan/penduduk/tambah')
  })
})
