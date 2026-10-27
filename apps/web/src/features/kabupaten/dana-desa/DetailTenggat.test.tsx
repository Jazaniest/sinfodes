import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { unduhBerkas } from '@/ui/unduh'
import { DetailTenggat } from './DetailTenggat'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id: string, akun: string = AKUN_KABUPATEN_UJI.admin, onDihapus = vi.fn()) {
  masukKabupatenSebagai(akun)
  renderKabupaten(
    <>
      <DetailTenggat id={id} sekarang={SEKARANG_UJI} onDihapus={onDihapus} />
      <PenampungToast />
    </>,
    contohSesiKabupaten(akun),
  )
  return { user: userEvent.setup(), onDihapus }
}

describe('detail tenggat (SPEC-V0.2 §8.3 butir 4: kabupaten melihat status per desa)', () => {
  it('judul, tanggal, kalimat jumlah, dan tabel status per desa', async () => {
    pasang('tgt_pll_smt1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Laporan realisasi APBDes semester I 2026' })).toBeInTheDocument()
    expect(screen.getByText(/Tenggat 30 Juli 2026 · lewat 56 hari/)).toBeInTheDocument()
    expect(screen.getByText(/\d+ dari 25 desa sudah mengirim/)).toBeInTheDocument()
    const tabel = screen.getByRole('table', { name: 'Status laporan per desa' })
    expect(within(tabel).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Kecamatan', 'Desa', 'Status', 'Tanggal kirim'])
    const ss = within(tabel).getByRole('rowheader', { name: 'Sungai Sialang' }).closest('tr')
    expect(ss).toHaveTextContent('Sudah dikirim')
    expect(ss).toHaveTextContent('26 Juli 2026')
  })
  it('filter status: Lewat tenggat hanya menampilkan desa yang belum mengirim', async () => {
    const { user } = pasang('tgt_pll_smt1')
    const tabel = await screen.findByRole('table', { name: 'Status laporan per desa' })
    const semua = within(tabel).getAllByRole('rowheader').length
    expect(semua).toBe(25)
    await user.click(screen.getByRole('radio', { name: 'Lewat tenggat' }))
    const sisa = within(tabel).getAllByRole('row').slice(1)
    expect(sisa.length).toBeGreaterThan(0)
    expect(sisa.length).toBeLessThan(semua)
    for (const r of sisa) expect(r).toHaveTextContent('Lewat tenggat')
  })
  it('Unduh CSV berisi satu baris per desa', async () => {
    vi.mocked(unduhBerkas).mockClear()
    const { user } = pasang('tgt_pll_smt1', AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: 'Status laporan per desa' })
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('tenggat-kab-pelalawan-2026-07-30.csv')
    expect(isi.split('\r\n').filter((b) => b !== '')).toHaveLength(26)
  })
  it('Peninjau tidak melihat Ubah dan Hapus', async () => {
    pasang('tgt_pll_smt1', AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: 'Status laporan per desa' })
    expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })
  it('Hapus: dialog menyebut jumlah desa yang sudah menandai; sesudahnya kembali ke Dana Desa', async () => {
    const { user, onDihapus } = pasang('tgt_pll_smt1')
    await screen.findByRole('table', { name: 'Status laporan per desa' })
    const sudah = ambilDb().kirimLaporan.filter((k) => k.tenggatId === 'tgt_pll_smt1').length
    await user.click(screen.getByRole('button', { name: 'Hapus' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Hapus tenggat "Laporan realisasi APBDes semester I 2026"?' })
    expect(dialog).toHaveTextContent(`${sudah} desa sudah menandai terkirim; tandanya ikut terhapus, dan pengingat di panel desa hilang.`)
    await user.click(within(dialog).getByRole('button', { name: 'Hapus tenggat' }))
    expect(await screen.findByText('Tenggat dihapus.')).toBeInTheDocument()
    expect(onDihapus).toHaveBeenCalledOnce()
    expect(ambilDb().tenggatLaporan.some((t) => t.id === 'tgt_pll_smt1')).toBe(false)
  })
  it('Ubah nama lewat dialog yang sama dengan tambah', async () => {
    const { user } = pasang('tgt_pll_dd2')
    await screen.findByRole('table', { name: 'Status laporan per desa' })
    await user.click(screen.getByRole('button', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah tenggat' })
    const nama = within(dialog).getByRole('textbox', { name: /^Nama laporan/ })
    await user.clear(nama)
    await user.type(nama, 'Laporan DD tahap II')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Laporan DD tahap II' })).toBeInTheDocument()
  })
  it('tenggat yang tidak ada: keterangan dengan tautan kembali', async () => {
    pasang('tgt_tidak_ada')
    expect(await screen.findByText('Tenggat tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Dana Desa' })).toHaveAttribute('href', '/kabupaten/admin/dana-desa')
  })
})
