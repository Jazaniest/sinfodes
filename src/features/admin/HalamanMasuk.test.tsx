import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { HalamanMasuk } from './HalamanMasuk'

pakaiApiTiruan()

function pasang() {
  const onBerhasil = vi.fn()
  render(<HalamanMasuk onBerhasil={onBerhasil} />)
  return { onBerhasil, user: userEvent.setup() }
}

describe('Halaman masuk (SPEC §5.6)', () => {
  it('email dikenali → desa tampil; kata sandi benar → berhasil', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email atau nama pengguna'), 'rosmiati@sungaisialang.desa.id')
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(await screen.findByText('Desa Sungai Sialang')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Kata sandi'), 'demo')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    await vi.waitFor(() => expect(onBerhasil).toHaveBeenCalledWith('demo.pgn_rosmiati'))
  })
  it('kata sandi salah → galat di kolom kata sandi', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email atau nama pengguna'), 'rosmiati@sungaisialang.desa.id{Enter}')
    await user.type(await screen.findByLabelText('Kata sandi'), 'salah{Enter}')
    expect(await screen.findByText('Email atau kata sandi salah.')).toBeInTheDocument()
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute('aria-invalid', 'true')
    expect(onBerhasil).not.toHaveBeenCalled()
  })
  it('email asing tetap lanjut ke kata sandi tanpa menampilkan desa', async () => {
    const { user } = pasang()
    await user.type(screen.getByLabelText('Email atau nama pengguna'), 'orang@contoh.id{Enter}')
    expect(await screen.findByLabelText('Kata sandi')).toBeInTheDocument()
    expect(screen.queryByText(/^Desa /)).not.toBeInTheDocument()
  })
  it('email kosong → pesan galat', async () => {
    const { user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(screen.getByText('Email atau nama pengguna wajib diisi.')).toBeInTheDocument()
  })
  it('lupa kata sandi → petunjuk menghubungi Sekretaris Desa', async () => {
    const { user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Lupa kata sandi' }))
    expect(screen.getByText(/diatur ulang oleh Sekretaris Desa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kembali ke halaman masuk' }))
    expect(screen.getByLabelText('Email atau nama pengguna')).toBeInTheDocument()
  })
})
