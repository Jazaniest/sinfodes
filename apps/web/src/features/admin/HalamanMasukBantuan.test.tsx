import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { ambilTiketBantuan } from '@/api/konsol'
import { beriAksesSinfodes } from '@/api/pengaturan'
import { AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderDenganRouter } from '@/test/router'
import { HalamanMasukBantuan } from './HalamanMasukBantuan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const pasang = (tiket: string | undefined) =>
  renderDenganRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HalamanMasukBantuan tiket={tiket} />
    </QueryClientProvider>,
  )

describe('masuk panel desa dengan tiket bantuan (SPEC-V0.2 §5.3)', () => {
  it('tiket sah: sesi bantuan tersimpan, lalu ke beranda panel', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi: true })
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const { tiket } = await ambilTiketBantuan('desa_sungai_sialang')
    const { router } = await pasang(tiket)
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    expect(ambilTokenSesi()).toMatch(/^bantuan\./)
  })
  it('tiket salah atau kosong: pesan untuk meminta ulang dari Konsol', async () => {
    await pasang('tiket-palsu')
    expect(await screen.findByText('Tiket bantuan tidak berlaku. Minta ulang dari Konsol.')).toBeInTheDocument()
  })
})
