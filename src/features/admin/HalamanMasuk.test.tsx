import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { DesaAlamat } from '@/domain/alamat/schema'
import { balasGalat } from '@/mocks/http'
import { serverUji } from '@/mocks/node'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { HalamanMasuk } from './HalamanMasuk'

pakaiApiTiruan()

const SUNGAI_SIALANG: DesaAlamat = {
  label: 'sungaisialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', status: 'Aktif', lambang: null,
}

function pasang(desa: DesaAlamat | null = SUNGAI_SIALANG, modeDemo = false) {
  const onBerhasil = vi.fn()
  render(<HalamanMasuk desa={desa} onBerhasil={onBerhasil} modeDemo={modeDemo} />)
  return { onBerhasil, user: userEvent.setup() }
}

describe('Halaman masuk panel desa (SPEC §5.6, SPEC-V0.2 §4.3)', () => {
  it('desa dari alamat langsung tampil, dengan email dan kata sandi dalam satu langkah', () => {
    pasang()
    expect(screen.getByText('Desa Sungai Sialang')).toBeInTheDocument()
    expect(screen.getByText('Teluk Meranti · Pelalawan')).toBeInTheDocument()
    expect(screen.getByLabelText('Email atau nama pengguna')).toBeInTheDocument()
    expect(screen.getByLabelText('Kata sandi')).toBeInTheDocument()
  })
  it('kata sandi benar → berhasil', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email atau nama pengguna'), 'rosmiati@sungaisialang.desa.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'demo')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    await vi.waitFor(() => expect(onBerhasil).toHaveBeenCalledWith('demo.pgn_rosmiati'))
  })
  it('akun desa lain → pesan berisi tautan ke alamat desanya', async () => {
    serverUji.use(
      http.post('*/api/v1/sesi/masuk', () =>
        balasGalat('FORBIDDEN', 'Akun ini terdaftar di Desa Tanjung Lamo.', 403, { alamatDesa: 'tanjunglamo' }),
      ),
    )
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email atau nama pengguna'), 'operator@tanjunglamo.desa.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'demo{Enter}')
    expect(await screen.findByText(/Akun ini terdaftar di Desa Tanjung Lamo\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tanjunglamo.sinfodes.localhost' })).toHaveAttribute(
      'href',
      'http://tanjunglamo.sinfodes.localhost:3000/admin/masuk',
    )
    expect(onBerhasil).not.toHaveBeenCalled()
  })
  it('kata sandi salah → galat di kolom kata sandi, tanpa tautan alamat desa', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email atau nama pengguna'), 'rosmiati@sungaisialang.desa.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'salah{Enter}')
    expect(await screen.findByText('Email atau kata sandi salah.')).toBeInTheDocument()
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('link', { name: /sinfodes\.localhost/ })).not.toBeInTheDocument()
    expect(onBerhasil).not.toHaveBeenCalled()
  })
  it('isian kosong → pesan galat di kedua kolom', async () => {
    const { user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(screen.getByText('Email atau nama pengguna wajib diisi.')).toBeInTheDocument()
    expect(screen.getByText('Kata sandi wajib diisi.')).toBeInTheDocument()
  })
  it('tanpa desa (alamat tidak dikenali) → tanpa kepala desa', () => {
    pasang(null)
    expect(screen.queryByText(/^Desa /)).not.toBeInTheDocument()
  })
  it('mode demo → tautan ke halaman demo di alamat induk', () => {
    pasang(SUNGAI_SIALANG, true)
    expect(screen.getByRole('link', { name: 'halaman demo' })).toHaveAttribute('href', 'http://sinfodes.localhost:3000/')
  })
  it('lupa kata sandi → petunjuk menghubungi Sekretaris Desa', async () => {
    const { user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Lupa kata sandi' }))
    expect(screen.getByText(/diatur ulang oleh Sekretaris Desa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kembali ke halaman masuk' }))
    expect(screen.getByLabelText('Email atau nama pengguna')).toBeInTheDocument()
  })
})
