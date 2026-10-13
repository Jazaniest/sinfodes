import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PropsPetaDesa } from '@/features/peta/PetaDesa'
import { ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { ProfilPublik } from './ProfilPublik'

// jsdom tidak punya WebGL: komponen MapLibre diganti tiruan yang bisa "mengeklik" objek dan berpura-pura gagal.
vi.mock('@/features/peta/PetaDesa', () => ({
  default: (p: PropsPetaDesa) => (
    <div data-testid="peta-tiruan">
      <p>Lapisan tampil: {(['dusun', 'fasilitas', 'kegiatan'] as const).filter((j) => p.tampil[j]).join(',')}</p>
      <button type="button" onClick={() => p.onPilih({ jenis: 'fasilitas', id: 'fas_ss_01' })}>
        klik kantor desa di peta
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

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Profil website desa (SPEC §9)', () => {
  it('sejarah, visi dan misi, dan foto kantor desa berkredit', async () => {
    renderPublik(<ProfilPublik />)
    expect(screen.getByRole('heading', { level: 1, name: 'Profil Desa Sungai Sialang' })).toBeInTheDocument()
    const sejarah = await screen.findByRole('region', { name: 'Sejarah' })
    expect(sejarah).toHaveTextContent(/pohon-pohon sialang yang tinggi/)
    expect(within(sejarah).getByText(/^Menurut cerita para tetua/).parentElement).toHaveClass('text-baca', 'max-w-[56ch]')
    const foto = screen.getByRole('img', { name: 'Kantor Desa Sungai Sialang' })
    expect(foto).toHaveAttribute('loading', 'eager')
    expect(foto.closest('figure')).toHaveTextContent(/Foto: .+ · CC/)
    const visi = screen.getByRole('region', { name: 'Visi dan misi' })
    expect(visi).toHaveTextContent('Terwujudnya Desa Sungai Sialang yang maju, mandiri, dan sejahtera')
    expect(within(visi).getAllByRole('listitem')).toHaveLength(5)
  })
  it('geografi: luas, batas empat arah, jarak ke ibu kota kecamatan dan kabupaten, dan empat dusun', async () => {
    renderPublik(<ProfilPublik />)
    const geo = await screen.findByRole('region', { name: 'Geografi dan wilayah' })
    expect(geo).toHaveTextContent('Luas wilayah48,6 km²')
    expect(geo).toHaveTextContent('Batas utaraSungai Kampar')
    expect(geo).toHaveTextContent('Batas baratDesa Teluk Pauh')
    expect(geo).toHaveTextContent('Jarak ke ibu kota kecamatan14 km · Teluk Meranti')
    expect(geo).toHaveTextContent('Jarak ke ibu kota kabupaten152 km · Pangkalan Kerinci')
    const dusun = within(geo).getByRole('list', { name: 'Wilayah dusun' })
    expect(within(dusun).getAllByRole('listitem')).toHaveLength(4)
    expect(dusun).toHaveTextContent('Dusun I Kampung TengahKepala dusun: Amran · 2 RW · 5 RT')
  })
  it('peta: semua lapisan tampil, dan objek yang dipilih di peta atau dari daftar ditulis keterangannya', async () => {
    renderPublik(<ProfilPublik />)
    const user = userEvent.setup()
    expect(await screen.findByText('Lapisan tampil: dusun,fasilitas,kegiatan')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'klik kantor desa di peta' }))
    expect(screen.getByText('Kantor Desa · Dusun I Kampung Tengah · Pusat layanan administrasi desa')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'klik dusun di peta' }))
    expect(screen.getByText('Dusun II Sialang Jaya · 2 RW · 5 RT')).toBeInTheDocument()
    const sd = screen.getByRole('button', { name: 'SD Negeri 012' })
    await user.click(sd)
    expect(sd).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('SD Negeri 012 · Dusun I Kampung Tengah · Sekolah dasar, 6 rombongan belajar')).toBeInTheDocument()
  })
  it('peta gagal dimuat: banner, dan daftar fasilitas umum tetap bisa dipilih (fokus review 2)', async () => {
    renderPublik(<ProfilPublik />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'peta gagal' }))
    expect(screen.getByText(/Peta tidak bisa ditampilkan di perangkat ini/)).toBeInTheDocument()
    expect(screen.queryByTestId('peta-tiruan')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Puskesmas Pembantu' }))
    expect(screen.getByText('Puskesmas Pembantu · Dusun II Sialang Jaya · Layanan kesehatan dasar, bidan desa')).toBeInTheDocument()
  })
  it('pemerintah desa dan lembaga dari Lembaga Desa, tanpa tautan ke data penduduk', async () => {
    renderPublik(<ProfilPublik />)
    const pemdes = await screen.findByRole('region', { name: 'Pemerintah desa' })
    expect(pemdes).toHaveTextContent('Kepala DesaH. Muhammad Nasir')
    expect(pemdes).toHaveTextContent('Sekretaris DesaHendri Saputra')
    expect(within(pemdes).queryAllByRole('link')).toHaveLength(0)
    const lembaga = screen.getByRole('region', { name: 'Lembaga desa' })
    expect(within(lembaga).getAllByRole('group')).toHaveLength(8)
    expect(lembaga).toHaveTextContent('Badan Permusyawaratan Desa')
    expect(lembaga).toHaveTextContent(/\(Ketua\) · 7 pengurus/)
    expect(within(lembaga).queryAllByRole('link')).toHaveLength(0)
  })
  it('desa yang belum mengisi profil dan peta: tiap bagian memberi keterangan (fokus review 1)', async () => {
    ubahDb((d) => {
      d.profilDesa = []
      d.peta = []
    })
    renderPublik(<ProfilPublik />)
    expect(await screen.findByText('Sejarah desa belum ditulis.')).toBeInTheDocument()
    expect(screen.getByText('Visi dan misi belum ditulis.')).toBeInTheDocument()
    expect(screen.getByText('Peta desa belum tersedia.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pemerintah desa' })).toHaveTextContent('Kepala Desa')
  })
})
