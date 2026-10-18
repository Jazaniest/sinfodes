import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderDenganRouter } from '@/test/router'
import { HalamanAlamatTidakDikenal } from './HalamanAlamatTidakDikenal'
import { HalamanPanelPindah } from './HalamanPanelPindah'

pakaiApiTiruan()

it('panel desa di alamat induk mengarahkan ke alamat desa (SPEC-V0.2 §4.4)', async () => {
  await renderDenganRouter(
    <QueryClientProvider client={new QueryClient()}>
      <HalamanPanelPindah />
    </QueryClientProvider>,
  )
  expect(screen.getByRole('heading', { level: 1, name: 'Panel desa sekarang ada di alamat desa Anda' })).toBeInTheDocument()
  expect(screen.getByText(/sungaisialang\.sinfodes\.localhost\/admin/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ke halaman utama Sinfodes' })).toHaveAttribute('href', 'http://sinfodes.localhost:3000/')
  expect(screen.getByRole('heading', { level: 2, name: 'Cari desa Anda' })).toBeInTheDocument()
})

it('nama terlarang menampilkan alamat tidak dikenal', async () => {
  await renderDenganRouter(<HalamanAlamatTidakDikenal />)
  expect(screen.getByRole('heading', { level: 1, name: 'Alamat tidak dikenal' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ke halaman utama Sinfodes' })).toHaveAttribute('href', 'http://sinfodes.localhost:3000/')
})
