import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { serverUji } from '@/mocks/node'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { MasukKabupaten } from './MasukKabupaten'

pakaiApiTiruan()

const PELALAWAN = { label: 'kab-pelalawan', kode: '14.05', nama: 'Pelalawan', mitra: true }

function pasang(kabupaten = PELALAWAN) {
  const onBerhasil = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MasukKabupaten kabupaten={kabupaten} onBerhasil={onBerhasil} />
    </QueryClientProvider>,
  )
  return { onBerhasil, user: userEvent.setup() }
}

describe('masuk dasbor kabupaten (SPEC-V0.2 §8.1)', () => {
  it('kabupaten mitra: lambang contoh, nama kabupaten, email dan kata sandi', async () => {
    const { onBerhasil, user } = pasang()
    expect(screen.getByRole('img', { name: 'Lambang contoh' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Dasbor Kabupaten Pelalawan' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'admin.pelalawan@demo.sinfodes.id')
    await user.type(screen.getByLabelText(/^Kata sandi/), 'demo')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(onBerhasil).toHaveBeenCalledOnce())
    expect(ambilTokenSesi('kabupaten')).toBe('kab.kab_fajar')
  })
  it('akun kabupaten lain: pesan dengan tautan ke alamat kabupaten akun', async () => {
    serverUji.use(
      http.post('*/api/v1/kabupaten/sesi/masuk', () =>
        HttpResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Akun ini terdaftar di Kabupaten Siak.', fields: { alamatKabupaten: 'kab-siak' } } },
          { status: 403 },
        ),
      ),
    )
    const { user } = pasang()
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'admin.siak@demo.sinfodes.id')
    await user.type(screen.getByLabelText(/^Kata sandi/), 'demo')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(await screen.findByText('Akun ini terdaftar di Kabupaten Siak.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Masuk di alamat kabupaten akun ini' })).toHaveAttribute(
      'href',
      'http://kab-siak.sinfodes.localhost:3000/admin/masuk',
    )
  })
  it('kabupaten yang belum mitra: tanpa formulir masuk (fokus review 4)', () => {
    pasang({ label: 'kab-kampar', kode: '14.01', nama: 'Kampar', mitra: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Kabupaten ini belum memakai Sinfodes' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /^Email/ })).not.toBeInTheDocument()
  })
})
