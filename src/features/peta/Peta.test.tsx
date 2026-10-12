import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { Peta } from './Peta'
import type { PropsPetaDesa } from './PetaDesa'

// jsdom tidak punya WebGL: komponen MapLibre diganti tiruan yang memperlihatkan props dan bisa "mengeklik" objek.
vi.mock('./PetaDesa', () => ({
  default: (p: PropsPetaDesa) => (
    <div data-testid="peta-tiruan">
      <p>Lapisan tampil: {(['dusun', 'fasilitas', 'kegiatan'] as const).filter((j) => p.tampil[j]).join(',')}</p>
      <button type="button" onClick={() => p.onPilih({ jenis: 'kegiatan', id: 'kgt_ss_04' })}>
        klik kegiatan di peta
      </button>
      <button type="button" onClick={() => p.onPilih({ jenis: 'dusun', id: 'dsn_ss_2' })}>
        klik dusun di peta
      </button>
      <button type="button" onClick={p.onGagal}>
        peta gagal
      </button>
    </div>
  ),
}))

pakaiApiTiruan()

function pasang(kegiatanAwal?: string) {
  masukSebagai(AKUN_UJI.kadus)
  renderPanel(<Peta kegiatanAwal={kegiatanAwal} />, contohSesi('kadus'))
  return userEvent.setup()
}
const panel = () => screen.getByRole('region', { name: 'Objek terpilih' })

describe('Peta Desa (SPEC §8)', () => {
  it('saklar lapisan: peta menerima lapisan yang dinyalakan', async () => {
    const user = pasang()
    expect(await screen.findByText('Lapisan tampil: dusun,fasilitas,kegiatan')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Fasilitas umum' }))
    expect(screen.getByText('Lapisan tampil: dusun,kegiatan')).toBeInTheDocument()
  })
  it('klik kegiatan di peta membuka panel info: status, progres fisik, dan tautan ke kegiatannya', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'klik kegiatan di peta' }))
    expect(within(panel()).getByRole('heading', { name: 'Sumur bor air bersih Dusun IV' })).toBeInTheDocument()
    expect(within(panel()).getByRole('meter', { name: 'Progres fisik' })).toHaveAttribute('aria-valuetext', '40,0%')
    expect(within(panel()).getByRole('link', { name: 'Buka kegiatan' })).toHaveAttribute('href', '/admin/pembangunan/kgt_ss_04')
  })
  it('klik dusun menampilkan kepala dusun dan posyandunya', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'klik dusun di peta' }))
    expect(within(panel()).getByRole('heading', { name: 'Dusun II Sialang Jaya' })).toBeInTheDocument()
    expect(panel()).toHaveTextContent('Sukardi')
    expect(panel()).toHaveTextContent('Posyandu Mawar')
  })
  it('daftar objek bisa dipakai tanpa peta: memilih fasilitas dari daftar', async () => {
    const user = pasang()
    const daftar = await screen.findByRole('list', { name: 'Fasilitas umum' })
    await user.click(within(daftar).getByRole('button', { name: /Posyandu Mawar/ }))
    expect(within(panel()).getByRole('heading', { name: 'Posyandu Mawar' })).toBeInTheDocument()
    expect(panel()).toHaveTextContent('Dusun II Sialang Jaya')
  })
  it('?kegiatan= dari detail pembangunan langsung terpilih; ID tak dikenal tidak memecah halaman (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const { unmount } = renderPanel(<Peta kegiatanAwal="kgt_ss_01" />, contohSesi('kadus'))
    expect(await screen.findByRole('heading', { name: 'Semenisasi jalan lingkungan Dusun III' })).toBeInTheDocument()
    unmount()
    pasang('kgt_xx')
    expect(await screen.findByText('Klik objek di peta, atau pilih dari daftar di bawah.')).toBeInTheDocument()
  })
  it('peta tidak bisa dimuat (tanpa WebGL): keterangan tampil, daftar objek tetap bisa dipakai (fokus review 4)', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'peta gagal' }))
    expect(screen.getByText(/Peta tidak bisa ditampilkan di perangkat ini/)).toBeInTheDocument()
    expect(screen.queryByTestId('peta-tiruan')).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('list', { name: 'Kegiatan pembangunan' })).getByRole('button', { name: /Drainase RT 006–007/ }))
    expect(within(panel()).getByRole('heading', { name: 'Drainase RT 006–007' })).toBeInTheDocument()
  })
})
