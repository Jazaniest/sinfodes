import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DemoToolbar } from './DemoToolbar'

const kendali = vi.hoisted(() => ({
  MODE_JARINGAN: ['instan', 'normal', 'lambat', 'gagal'] as const,
  bacaModeJaringan: vi.fn(() => 'normal' as const),
  aturModeJaringan: vi.fn(),
  infoDataDemo: vi.fn(() => ({ tanggalAcuan: '2026-09-24T09:00:00+07:00', jiwa: 2812, kk: 806, dusun: 4 })),
  resetDataDemo: vi.fn(async () => ({ tanggalAcuan: '2026-09-24T09:00:00+07:00', jiwa: 2812, kk: 806, dusun: 4 })),
  dataDemoTerpisah: vi.fn(() => false),
}))
vi.mock('@/mocks/kendali', () => kendali)

beforeEach(() => vi.clearAllMocks())

function pasang() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DemoToolbar />
      <PenampungToast />
    </QueryClientProvider>,
  )
}

describe('DemoToolbar (SPEC §3.6)', () => {
  it('di luar alamat induk ada tautan kembali ke halaman demo (SPEC-V0.2 §4.6)', async () => {
    pasang()
    expect(await screen.findByRole('link', { name: 'Halaman demo' })).toHaveAttribute('href', 'http://sinfodes.localhost:3000/')
  })
  it('hub tidak terjangkau → keterangan data terpisah per alamat', async () => {
    kendali.dataDemoTerpisah.mockReturnValue(true)
    pasang()
    expect(await screen.findByText('Data demo terpisah per alamat')).toBeInTheDocument()
  })
  it('mengganti mode koneksi', async () => {
    pasang()
    await userEvent.selectOptions(await screen.findByLabelText('Koneksi'), 'lambat')
    expect(kendali.aturModeJaringan).toHaveBeenCalledWith('lambat')
  })
  it('reset data meminta konfirmasi dulu', async () => {
    pasang()
    await userEvent.click(await screen.findByRole('button', { name: /Reset data/ }))
    expect(kendali.resetDataDemo).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Ya, reset' }))
    expect(kendali.resetDataDemo).toHaveBeenCalledOnce()
    expect(await screen.findByText('Data demo dikembalikan ke kondisi awal.')).toBeInTheDocument()
  })
  it('bisa disembunyikan lalu dibuka lagi', async () => {
    pasang()
    await userEvent.click(await screen.findByRole('button', { name: 'Sembunyikan kontrol demo' }))
    expect(screen.queryByRole('region', { name: 'Kontrol demo' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol demo' }))
    expect(screen.getByRole('region', { name: 'Kontrol demo' })).toBeInTheDocument()
  })
  it('menandai <html> selama terbuka, supaya bilah aksi formulir memberi ruang di layar sempit', async () => {
    const { unmount } = pasang()
    await screen.findByRole('region', { name: 'Kontrol demo' })
    expect(document.documentElement).toHaveAttribute('data-demo-toolbar')
    await userEvent.click(screen.getByRole('button', { name: 'Sembunyikan kontrol demo' }))
    expect(document.documentElement).not.toHaveAttribute('data-demo-toolbar')
    await userEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol demo' }))
    expect(document.documentElement).toHaveAttribute('data-demo-toolbar')
    unmount()
    expect(document.documentElement).not.toHaveAttribute('data-demo-toolbar')
  })
})
