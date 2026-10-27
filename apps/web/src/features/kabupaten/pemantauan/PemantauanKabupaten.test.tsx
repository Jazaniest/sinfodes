import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { unduhBerkas } from '@/ui/unduh'
import { PemantauanKabupaten } from './PemantauanKabupaten'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan()

const NAMA_TABEL = 'Pemantauan Kabupaten Pelalawan per kecamatan'

function pasang(id: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(id)
  renderKabupaten(<PemantauanKabupaten sekarang={SEKARANG_UJI} />, contohSesiKabupaten(id))
  return userEvent.setup()
}

describe('Pemantauan di dasbor kabupaten (SPEC-V0.2 §8.3 butir 3)', () => {
  it('kabupaten dari sesi tanpa pilihan kabupaten; 12 kecamatan tertutup dan baris total', async () => {
    pasang()
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    expect(screen.getByRole('heading', { level: 1, name: 'Pemantauan' })).toBeInTheDocument()
    expect(screen.getByText('Kabupaten Pelalawan · 32 desa · Kamis, 24 September 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kabupaten$/ })).not.toBeInTheDocument()
    expect(within(tabel).getAllByRole('button', { expanded: false })).toHaveLength(12)
    expect(within(tabel).getByRole('rowheader', { name: 'Kabupaten Pelalawan' }).closest('tr')).toHaveTextContent('21 dari 32 aktif')
  })
  it('membuka kecamatan: desa bertautan ke websitenya; Tanjung Lamo dengan "—"', async () => {
    const user = pasang()
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    const teluk = within(tabel).getByRole('button', { name: 'Teluk Meranti' })
    await user.click(teluk)
    expect(teluk).toHaveAttribute('aria-expanded', 'true')
    const tautan = within(tabel).getByRole('link', { name: 'Sungai Sialang' })
    expect(tautan).toHaveAttribute('href', 'http://sungaisialang.sinfodes.localhost:3000/')
    const ss = tautan.closest('tr')
    expect(ss).toHaveTextContent('Aktif')
    expect(ss).toHaveTextContent('99,6%')
    await user.click(within(tabel).getByRole('button', { name: 'Kuala Kampar' }))
    const tl = within(tabel).getByRole('rowheader', { name: 'Tanjung Lamo' }).closest('tr')
    if (!tl) throw new Error('Baris Tanjung Lamo tidak ada')
    expect(tl).toHaveTextContent('Persiapan')
    expect(within(tl).getAllByText('—')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Buka semua desa' }))
    expect(within(tabel).getAllByRole('button', { expanded: true })).toHaveLength(12)
  })
  it('Unduh CSV: satu baris per desa, nama berkas beralamat kabupaten dan berbulan', async () => {
    vi.mocked(unduhBerkas).mockClear()
    const user = pasang()
    await screen.findByRole('table', { name: NAMA_TABEL })
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    expect(unduhBerkas).toHaveBeenCalledOnce()
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('pemantauan-kab-pelalawan-2026-09.csv')
    const baris = isi.split('\r\n')
    expect(baris).toHaveLength(34)
    expect(baris).toContain('Kuala Kampar;Tanjung Lamo;Persiapan;0;;;;')
  })
  it('Peninjau melihat layar yang sama', async () => {
    pasang(AKUN_KABUPATEN_UJI.peninjau)
    expect(await screen.findByRole('table', { name: NAMA_TABEL })).toBeInTheDocument()
  })
})
