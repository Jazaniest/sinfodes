import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { unduhBerkas } from '@/ui/unduh'
import { DataGabungan } from './DataGabungan'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan()

const NAMA_TABEL = 'Data gabungan Kabupaten Pelalawan per kecamatan'

function pasang(id: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(id)
  renderKabupaten(<DataGabungan />, contohSesiKabupaten(id))
  return userEvent.setup()
}

describe('Data gabungan di dasbor kabupaten (SPEC-V0.2 §8.3 butir 6)', () => {
  it('judul, kepala tabel dua tingkat, dan keterangan penyamaran', async () => {
    pasang()
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    expect(screen.getByRole('heading', { level: 1, name: 'Data gabungan' })).toBeInTheDocument()
    expect(screen.getByText('Penduduk dan penerima bansos · Kabupaten Pelalawan · Kamis, 24 September 2026')).toBeInTheDocument()
    const kepala = within(tabel).getAllByRole('columnheader').map((h) => h.textContent)
    expect(kepala).toEqual([
      'Kecamatan / desa', 'Penduduk', 'KK', 'Kelompok umur', 'Penerima bansos (KK)',
      'Laki-laki', 'Perempuan', 'Jumlah', '0-4', '5-14', '15-59', '60+', 'BLT-DD', 'PKH', 'Bantuan Pangan',
    ])
    expect(
      screen.getByText(
        'Angka 1-4 ditampilkan sebagai <5. Tanda * berarti angka ikut disamarkan, supaya angka <5 di baris atau kolom yang sama tidak bisa dihitung dari jumlahnya.',
      ),
    ).toBeInTheDocument()
    expect(within(tabel).getByRole('rowheader', { name: 'Jumlah kabupaten' })).toBeInTheDocument()
  })
  it('kecamatan dibuka per desa; sel tersamar tampil apa adanya; desa tanpa data diberi keterangan', async () => {
    const user = pasang()
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    await user.click(screen.getByRole('button', { name: 'Buka semua desa' }))
    expect(within(tabel).getAllByText('<5').length).toBeGreaterThan(0)
    expect(within(tabel).getAllByText('*').length).toBeGreaterThan(0)
    const tl = within(tabel).getByRole('rowheader', { name: 'Tanjung Lamo' }).closest('tr')
    expect(tl).toHaveTextContent('Belum ada data penduduk')
    // Tidak ada sel bernilai 1-4 di tabel (fokus review 2).
    for (const td of tabel.querySelectorAll('td')) expect(td.textContent ?? '').not.toMatch(/^[1-4]$/)
  })
  it('Unduh CSV beralamat kabupaten dan bertanggal', async () => {
    vi.mocked(unduhBerkas).mockClear()
    const user = pasang(AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: NAMA_TABEL })
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('data-gabungan-kab-pelalawan-2026-09-24.csv')
    expect(isi).toContain('<5')
  })
})
