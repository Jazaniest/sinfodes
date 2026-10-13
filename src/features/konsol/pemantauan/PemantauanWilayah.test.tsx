import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKonsol } from '@/test/konsol'
import { renderKonsol } from '@/test/render'
import { unduhBerkas } from '@/ui/unduh'
import { PemantauanWilayah } from './PemantauanWilayah'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan()

const NAMA_TABEL = 'Pemantauan Kabupaten Pelalawan per kecamatan'

function pasang(peran: 'tim' | 'pemantau') {
  masukKonsolSebagai(AKUN_KONSOL_UJI[peran])
  const onUbahWilayah = vi.fn()
  renderKonsol(<PemantauanWilayah wilayah={null} onUbahWilayah={onUbahWilayah} sekarang={SEKARANG_UJI} />, contohSesiKonsol(peran))
  return { onUbahWilayah, user: userEvent.setup() }
}

describe('Pemantauan wilayah (SPEC §11 layar 5)', () => {
  it('pemantau: kabupatennya tanpa pilihan kabupaten; 12 kecamatan tertutup dan baris total', async () => {
    pasang('pemantau')
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    expect(screen.getByRole('heading', { level: 1, name: 'Pemantauan wilayah' })).toBeInTheDocument()
    expect(screen.getByText('Kabupaten Pelalawan · 32 desa · Kamis, 24 September 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kabupaten$/ })).not.toBeInTheDocument()
    expect(within(tabel).getAllByRole('button', { expanded: false })).toHaveLength(12)
    expect(within(tabel).getByRole('rowheader', { name: 'Kabupaten Pelalawan' }).closest('tr')).toHaveTextContent('21 dari 32 aktif')
  })
  it('membuka kecamatan menampilkan desanya: Sungai Sialang dengan angkanya, Tanjung Lamo dengan "—" (fokus review 3)', async () => {
    const { user } = pasang('pemantau')
    const tabel = await screen.findByRole('table', { name: NAMA_TABEL })
    const teluk = within(tabel).getByRole('button', { name: 'Teluk Meranti' })
    await user.click(teluk)
    expect(teluk).toHaveAttribute('aria-expanded', 'true')
    const ss = within(tabel).getByRole('rowheader', { name: 'Sungai Sialang' }).closest('tr')
    expect(ss).toHaveTextContent('Aktif')
    expect(ss).toHaveTextContent('99,6%')
    expect(ss).toHaveTextContent(/\d+ jam/)
    await user.click(within(tabel).getByRole('button', { name: 'Kuala Kampar' }))
    const tl = within(tabel).getByRole('rowheader', { name: 'Tanjung Lamo' }).closest('tr')
    if (!tl) throw new Error('Baris Tanjung Lamo tidak ada')
    expect(tl).toHaveTextContent('Persiapan')
    expect(within(tl).getAllByText('—')).toHaveLength(4)
    await user.click(teluk)
    expect(within(tabel).queryByRole('rowheader', { name: 'Sungai Sialang' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Buka semua desa' }))
    expect(within(tabel).getAllByRole('button', { expanded: true })).toHaveLength(12)
    expect(screen.getByRole('button', { name: 'Tutup semua desa' })).toBeInTheDocument()
  })
  it('Unduh CSV: satu baris per desa, nama berkas berkabupaten dan bertanggal (fokus review 4)', async () => {
    vi.mocked(unduhBerkas).mockClear()
    const { user } = pasang('pemantau')
    await screen.findByRole('table', { name: NAMA_TABEL })
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    expect(unduhBerkas).toHaveBeenCalledOnce()
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('pemantauan-pelalawan-2026-09-24.csv')
    const baris = isi.split('\r\n')
    expect(baris).toHaveLength(34)
    expect(baris).toContain('Kuala Kampar;Tanjung Lamo;Persiapan;0;;;;')
    expect(baris.some((b) => /^Teluk Meranti;Sungai Sialang;Aktif;\d+;\d+,\d;99,6;\d+,\d;\d+,\d$/.test(b))).toBe(true)
  })
  it('Tim Sinfodes: bawaannya Pelalawan; memilih kabupaten lain lewat alamat halaman', async () => {
    const { onUbahWilayah, user } = pasang('tim')
    expect(await screen.findByText(/^Kabupaten Pelalawan · 32 desa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Kabupaten$/ }))
    await user.click(await screen.findByRole('option', { name: 'Kampar' }))
    expect(onUbahWilayah).toHaveBeenCalledWith('14.01')
  })
})
