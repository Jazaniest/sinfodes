import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { serverUji } from '@/mocks/node'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderDenganRouter } from '@/test/router'
import { GalatPublik } from './GalatPublik'

pakaiApiTiruan()

const pasang = (error: Error) =>
  renderDenganRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GalatPublik error={error} reset={() => {}} />
    </QueryClientProvider>,
  )

describe('website desa gagal dibuka (fokus review 4)', () => {
  it('alamat tak dikenal: "Website desa tidak ditemukan" dengan tautan Cari desa, tanpa Coba lagi', async () => {
    await pasang(new GalatApi('NOT_FOUND', 'Website desa tidak ditemukan.', 404))
    expect(await screen.findByRole('heading', { level: 1, name: 'Website desa tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cari desa di halaman utama Sinfodes' })).toHaveAttribute(
      'href',
      'http://sinfodes.localhost:3000/#cari-desa',
    )
    expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument()
  })
  it('alamat desa Persiapan: halaman "sedang disiapkan", tanpa data desa (SPEC-V0.2 §4.1)', async () => {
    serverUji.use(
      http.get('*/api/v1/alamat', () =>
        HttpResponse.json({
          jenis: 'desa',
          desa: { label: 'tanjunglamo', nama: 'Tanjung Lamo', kecamatan: 'Kuala Kampar', kabupaten: 'Pelalawan', status: 'Persiapan', lambang: null, tampilanWarga: null },
        }),
      ),
    )
    await pasang(new GalatApi('NOT_FOUND', 'Website desa tidak ditemukan.', 404))
    expect(await screen.findByRole('heading', { level: 1, name: 'Website Desa Tanjung Lamo sedang disiapkan' })).toBeInTheDocument()
    expect(screen.getByText('Desa sedang menyiapkan data dan tampilan websitenya. Silakan kembali lagi nanti.')).toBeInTheDocument()
    expect(screen.queryByText('Website desa tidak ditemukan')).not.toBeInTheDocument()
  })
  it('koneksi gagal: pesan galat dengan Coba lagi', async () => {
    await pasang(new GalatApi('SERVER', 'Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.', 503))
    expect(screen.getByText('Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})
