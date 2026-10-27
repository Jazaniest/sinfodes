import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { masukKonsol } from '@/api/konsol'
import { serverUji } from '@/mocks/node'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { FormMasukKonsol } from './FormMasukKonsol'

pakaiApiTiruan()
afterEach(() => vi.unstubAllEnvs())

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
  it('mode demo: tidak ada isian kode autentikator', () => {
    vi.stubEnv('VITE_DEMO', 'true')
    pasang()
    expect(screen.queryByLabelText('Kode autentikator')).not.toBeInTheDocument()
  })
  it('mode nyata: ada isian kode autentikator, dan kodenya dikirim bersama email dan kata sandi (SPEC-V0.3 §8.4)', async () => {
    vi.stubEnv('VITE_DEMO', 'false')
    const { sesi } = await masukKonsol('dina@sinfodes.id', 'demo')
    const badan: unknown[] = []
    serverUji.use(
      http.post('*/api/v1/konsol/sesi/masuk', async ({ request }) => {
        badan.push(await request.json())
        return HttpResponse.json({ sesi })
      }),
    )
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email'), 'dina@sinfodes.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'demo')
    await user.type(screen.getByLabelText('Kode autentikator'), '012345')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    await vi.waitFor(() => expect(onBerhasil).toHaveBeenCalledOnce())
    expect(badan).toEqual([{ email: 'dina@sinfodes.id', kataSandi: 'demo', kodeTotp: '012345' }])
  })
  it('mode nyata: kode dikosongkan tidak dikirim', async () => {
    vi.stubEnv('VITE_DEMO', 'false')
    const { sesi } = await masukKonsol('dina@sinfodes.id', 'demo')
    const badan: unknown[] = []
    serverUji.use(
      http.post('*/api/v1/konsol/sesi/masuk', async ({ request }) => {
        badan.push(await request.json())
        return HttpResponse.json({ sesi })
      }),
    )
    const { onBerhasil, user } = pasang()
    await user.type(screen.getByLabelText('Email'), 'dina@sinfodes.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'demo')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    await vi.waitFor(() => expect(onBerhasil).toHaveBeenCalledOnce())
    expect(badan).toEqual([{ email: 'dina@sinfodes.id', kataSandi: 'demo' }])
  })
})
