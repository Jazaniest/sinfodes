import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { unduhBerkas } from '@/ui/unduh'
import { DanaDesaKabupaten } from './DanaDesaKabupaten'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan()

const NAMA_TABEL = 'Dana Desa Kabupaten Pelalawan per kecamatan'

function pasang(id: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(id)
  renderKabupaten(<DanaDesaKabupaten sekarang={SEKARANG_UJI} />, contohSesiKabupaten(id))
  return userEvent.setup()
}

describe('Dana Desa di dasbor kabupaten (SPEC-V0.2 §8.3 butir 4)', () => {
  it('judul, kalimat median dan desa tertinggal, serta keterangan sumber angka', async () => {
    pasang()
    await screen.findByRole('table', { name: NAMA_TABEL })
    expect(screen.getByRole('heading', { level: 1, name: 'Dana Desa' })).toBeInTheDocument()
    expect(screen.getByText('Realisasi belanja APBDes 2026 · Kabupaten Pelalawan')).toBeInTheDocument()
    expect(screen.getByText('Median realisasi desa 63,2%. 2 desa tertinggal, lebih dari 15 poin di bawah median.')).toBeInTheDocument()
    expect(screen.getByText(/Angka ini realisasi belanja APBDes secara keseluruhan\. Pemisahan per sumber dana \(DD, ADD, PAD\)/)).toBeInTheDocument()
  })
  it('tabel per kecamatan; Teluk Meranti dibuka menampilkan Sungai Sialang; desa tanpa APBDes dan desa tertinggal ditandai', async () => {
    const user = pasang()
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    const kepala = within(tabel).getAllByRole('columnheader').map((h) => h.textContent)
    expect(kepala).toEqual(['Kecamatan / desa', 'Desa ber-APBDes', 'Pagu', 'Realisasi', '%'])
    expect(within(tabel).getAllByRole('button', { expanded: false })).toHaveLength(12)
    await user.click(within(tabel).getByRole('button', { name: 'Teluk Meranti' }))
    const ss = within(tabel).getByRole('link', { name: 'Sungai Sialang' }).closest('tr')
    expect(ss).toHaveTextContent('63,2%')
    expect(ss).toHaveTextContent(/Rp/)
    await user.click(screen.getByRole('button', { name: 'Buka semua desa' }))
    const tl = within(tabel).getByRole('rowheader', { name: 'Tanjung Lamo' }).closest('tr')
    expect(tl).toHaveTextContent('Belum ada APBDes tahun ini')
    expect(within(tabel).getAllByText('Tertinggal')).toHaveLength(2)
  })
  it('Unduh CSV beralamat kabupaten dan bertanggal; satu baris per desa', async () => {
    vi.mocked(unduhBerkas).mockClear()
    const user = pasang(AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: NAMA_TABEL })
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('dana-desa-kab-pelalawan-2026-09-24.csv')
    expect(isi.split('\r\n').filter((b) => b !== '')).toHaveLength(33)
  })
})
