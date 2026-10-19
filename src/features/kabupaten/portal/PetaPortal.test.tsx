import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { portalKabupatenSchema } from '@/domain/kabupaten/portal'
import type { PropsPetaTitikDesa } from '@/features/peta/PetaTitikDesa'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { PetaPortal } from './PetaPortal'

vi.mock('@/features/peta/PetaTitikDesa', () => ({
  default: (p: PropsPetaTitikDesa) => (
    <div data-testid="peta-tiruan">
      <p>{`${p.titik.length} titik`}</p>
      <button type="button" onClick={() => p.onPilih('sungaisialang')}>
        klik Sungai Sialang
      </button>
      <button type="button" onClick={() => p.onPilih(p.titik.find((t) => t.id.startsWith('persiapan:'))?.id ?? '')}>
        klik desa persiapan
      </button>
      <button type="button" onClick={p.onGagal}>
        peta gagal
      </button>
    </div>
  ),
}))

pakaiApiTiruan()

async function pasang() {
  const r = await fetch('http://kab-pelalawan.sinfodes.localhost/api/v1/kabupaten/portal')
  const portal = portalKabupatenSchema.parse(await r.json())
  if (!portal.mitra) throw new Error('Pelalawan harus mitra')
  render(<PetaPortal peta={portal.peta} />)
  return userEvent.setup()
}

describe('peta desa di portal kabupaten (SPEC-V0.2 §8.2)', () => {
  it('legenda dua kelompok dengan jumlahnya, tanpa angka Indeks atau Dana Desa', async () => {
    await pasang()
    expect(screen.getByRole('heading', { level: 2, name: 'Peta desa' })).toBeInTheDocument()
    expect(await screen.findByText('30 titik')).toBeInTheDocument()
    const legenda = screen.getByRole('list', { name: 'Keterangan warna' })
    expect(within(legenda).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['Sudah bergabung (25)', 'Dalam persiapan (5)'])
  })
  it('titik desa bergabung bertautan ke websitenya; titik Persiapan tanpa tautan', async () => {
    const user = await pasang()
    await user.click(await screen.findByRole('button', { name: 'klik Sungai Sialang' }))
    const kartu = screen.getByRole('region', { name: 'Desa terpilih' })
    expect(kartu).toHaveTextContent('Sungai Sialang')
    expect(kartu).toHaveTextContent('Kecamatan Teluk Meranti')
    expect(within(kartu).getByRole('link', { name: 'Buka website Sungai Sialang' })).toHaveAttribute('href', 'http://sungaisialang.sinfodes.localhost:3000/')
    await user.click(screen.getByRole('button', { name: 'klik desa persiapan' }))
    expect(screen.getByRole('region', { name: 'Desa terpilih' })).toHaveTextContent('Sedang bersiap memakai Sinfodes')
    expect(within(screen.getByRole('region', { name: 'Desa terpilih' })).queryByRole('link')).not.toBeInTheDocument()
  })
  it('peta gagal: banner menunjuk ke daftar desa di bawahnya', async () => {
    const user = await pasang()
    await user.click(await screen.findByRole('button', { name: 'peta gagal' }))
    expect(screen.getByText('Peta tidak bisa ditampilkan di perangkat ini. Daftar desa di bawah tetap bisa dibuka.')).toBeInTheDocument()
  })
})
