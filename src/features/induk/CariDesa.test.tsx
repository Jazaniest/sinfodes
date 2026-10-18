import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { serverUji } from '@/mocks/node'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { CariDesa } from './CariDesa'

pakaiApiTiruan()

function pasang() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CariDesa />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), kotak: screen.getByRole('searchbox', { name: 'Nama desa' }) }
}

describe('Cari desa di halaman utama (SPEC-V0.2 §4.4)', () => {
  it('bagian berjudul "Cari desa Anda" dengan id tujuan tautan #cari-desa', () => {
    pasang()
    const bagian = screen.getByRole('region', { name: 'Cari desa Anda' })
    expect(bagian).toHaveAttribute('id', 'cari-desa')
  })
  it('kurang dari 3 huruf: tidak ada permintaan ke API', async () => {
    const diminta: string[] = []
    serverUji.events.on('request:start', ({ request }) => {
      if (request.url.includes('/induk/cari-desa')) diminta.push(request.url)
    })
    const { user, kotak } = pasang()
    await user.type(kotak, 'si')
    await new Promise((r) => setTimeout(r, 450))
    expect(diminta).toEqual([])
  })
  it('hasil: tautan ke alamat desa dengan kecamatan dan kabupaten, jumlahnya diumumkan', async () => {
    const { user, kotak } = pasang()
    await user.type(kotak, 'sial')
    const tautan = await screen.findByRole('link', { name: /^Desa Sungai Sialang/ })
    expect(tautan).toHaveAttribute('href', 'http://sungaisialang.sinfodes.localhost:3000/')
    expect(tautan).toHaveTextContent('Teluk Meranti · Pelalawan')
    expect(screen.getByRole('status')).toHaveTextContent('1 desa ditemukan')
  })
  it('tanpa hasil: kalimat yang menyebut kata carinya', async () => {
    const { user, kotak } = pasang()
    await user.type(kotak, 'zzzz')
    expect(await within(screen.getByRole('status')).findByText('Tidak ada desa bernama "zzzz" yang sudah memakai Sinfodes.')).toBeInTheDocument()
  })
})
