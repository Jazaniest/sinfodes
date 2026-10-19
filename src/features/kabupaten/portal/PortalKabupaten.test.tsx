import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { portalKabupatenSchema, type PortalKabupaten as DataPortal } from '@/domain/kabupaten/portal'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { PortalKabupaten } from './PortalKabupaten'

// jsdom tidak punya WebGL; peta portal diuji di PetaPortal.test.tsx.
vi.mock('@/features/peta/PetaTitikDesa', () => ({ default: () => <div data-testid="peta-tiruan" /> }))

pakaiApiTiruan()

/** Data portal dari API tiruan di alamat kabupaten itu, bukan contoh buatan tangan. */
async function dataPortal(label: string): Promise<DataPortal> {
  const r = await fetch(`http://${label}.sinfodes.localhost/api/v1/kabupaten/portal`)
  return portalKabupatenSchema.parse(await r.json())
}
const pasang = (portal: DataPortal) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PortalKabupaten portal={portal} />
    </QueryClientProvider>,
  )

describe('portal publik kabupaten (SPEC-V0.2 §8.2)', () => {
  it('judul, lambang contoh, dan jumlah desa yang sudah memakai Sinfodes', async () => {
    pasang(await dataPortal('kab-pelalawan'))
    expect(screen.getByRole('heading', { level: 1, name: 'Desa Digital Kabupaten Pelalawan' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Lambang contoh' }).length).toBeGreaterThan(0)
    expect(screen.getByText('25 desa di Kabupaten Pelalawan sudah memakai Sinfodes.')).toBeInTheDocument()
    expect(screen.getByText('Data contoh')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Peta desa' })).toBeInTheDocument()
  })
  it('daftar per kecamatan; setiap desa bertautan ke websitenya', async () => {
    pasang(await dataPortal('kab-pelalawan'))
    const daftar = screen.getByRole('region', { name: 'Desa yang sudah memakai Sinfodes' })
    expect(within(daftar).getByRole('heading', { level: 2, name: 'Desa yang sudah memakai Sinfodes' })).toBeInTheDocument()
    expect(within(daftar).getByRole('heading', { level: 3, name: 'Teluk Meranti' })).toBeInTheDocument()
    expect(within(daftar).getAllByRole('link')).toHaveLength(25)
    expect(within(daftar).getByRole('link', { name: 'Sungai Sialang' })).toHaveAttribute('href', 'http://sungaisialang.sinfodes.localhost:3000/')
    expect(within(daftar).queryByRole('link', { name: 'Tanjung Lamo' })).not.toBeInTheDocument()
  })
  it('ajakan untuk desa yang belum bergabung, dan tautan masuk dasbor di kaki', async () => {
    pasang(await dataPortal('kab-pelalawan'))
    expect(screen.getByText('79 desa lain di Kabupaten Pelalawan belum memakai Sinfodes.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Daftarkan desa Anda' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\//)
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Masuk dasbor kabupaten' })).toHaveAttribute(
      'href', '/kabupaten/admin/masuk',
    )
  })
  it('kabupaten yang belum mitra: keterangan dan Cari desa, tanpa daftar dan tanpa tautan masuk', async () => {
    pasang(await dataPortal('kab-kampar'))
    expect(screen.getByRole('heading', { level: 1, name: 'Kabupaten ini belum memakai Sinfodes' })).toBeInTheDocument()
    expect(screen.getByText('Kabupaten Kampar')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Cari desa Anda' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Masuk dasbor kabupaten' })).not.toBeInTheDocument()
  })
})
