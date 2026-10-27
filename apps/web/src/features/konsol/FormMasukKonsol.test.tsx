import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { FormMasukKonsol } from './FormMasukKonsol'

pakaiApiTiruan()

function pasang() {
  const onBerhasil = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FormMasukKonsol onBerhasil={onBerhasil} />
    </QueryClientProvider>,
  )
  return { onBerhasil, user: userEvent.setup() }
}

describe('masuk Konsol (SPEC §3.5)', () => {
  it('kata sandi salah: galat di kolom kata sandi, tanpa token', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email'), 'dina@sinfodes.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'salah')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(await screen.findByText('Email atau kata sandi salah.')).toBeInTheDocument()
    expect(onBerhasil).not.toHaveBeenCalled()
    expect(ambilTokenSesi('konsol')).toBeNull()
  })
  it('berhasil: token konsol disimpan, lalu onBerhasil dipanggil', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email'), 'dina@sinfodes.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'demo')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    await vi.waitFor(() => expect(onBerhasil).toHaveBeenCalledOnce())
    expect(ambilTokenSesi('konsol')).toBe('konsol.kns_dina')
  })
})
