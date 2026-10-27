import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BOM } from '@/domain/format/csv'
import { KOLOM_CSV_SIARAN } from '@/domain/kabupaten/siaran'
import { ubahDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { unduhBerkas } from '@/ui/unduh'
import { DetailSiaran } from './DetailSiaran'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id: string, akun: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(akun)
  renderKabupaten(
    <>
      <DetailSiaran id={id} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesiKabupaten(akun),
  )
  return { user: userEvent.setup() }
}

describe('detail siaran kabupaten (SPEC-V0.2 §8.4 Di dasbor kabupaten)', () => {
  it('isi, lampiran, tenggat, angka baca, dan tabel status per desa', async () => {
    pasang('srn_pll_rakor')
    expect(await screen.findByRole('heading', { level: 1, name: 'Undangan rapat koordinasi penyaluran Dana Desa tahap II' })).toBeInTheDocument()
    expect(screen.getByText('Dikirim 4 September 2026 pukul 10.00 oleh Fajar Ramadhan · Semua desa')).toBeInTheDocument()
    expect(screen.getByText('undangan-rakor-dd-tahap-2.pdf · 284 KB')).toBeInTheDocument()
    expect(screen.getByText('Perlu tindak lanjut sampai 11 September 2026.')).toBeInTheDocument()
    expect(screen.getByText(/^\d+ dari 25 desa sudah membaca · \d+ sudah menindaklanjuti$/)).toBeInTheDocument()
    const tabel = screen.getByRole('table', { name: 'Status per desa' })
    expect(within(tabel).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Kecamatan', 'Desa', 'Status', 'Dibaca', 'Tindak lanjut'])
    expect(within(tabel).getAllByRole('rowheader')).toHaveLength(25)
  })
  it('filter Ditindaklanjuti: baris Sungai Sialang dengan catatannya', async () => {
    const { user } = pasang('srn_pll_rakor')
    const tabel = await screen.findByRole('table', { name: 'Status per desa' })
    await user.click(screen.getByRole('radio', { name: 'Ditindaklanjuti' }))
    const baris = within(tabel).getAllByRole('row').slice(1)
    for (const r of baris) expect(r).toHaveTextContent('Ditindaklanjuti')
    const ss = within(tabel).getByRole('rowheader', { name: 'Sungai Sialang' }).closest('tr')
    expect(ss).toHaveTextContent('5 Sep 2026: Sekretaris Desa dan Kaur Keuangan akan hadir.')
    expect(ss).toHaveTextContent('4 Sep 2026 13.10')
  })
  it('siaran tanpa tindak lanjut: tanpa filter Ditindaklanjuti', async () => {
    pasang('srn_pll_libur')
    await screen.findByRole('table', { name: 'Status per desa' })
    expect(screen.getByText('Tanpa tindak lanjut.')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Ditindaklanjuti' })).not.toBeInTheDocument()
  })
  it('Unduh CSV: kepala kolom dan 25 baris desa', async () => {
    vi.mocked(unduhBerkas).mockClear()
    const { user } = pasang('srn_pll_rakor', AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: 'Status per desa' })
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('status-siaran-kab-pelalawan-srn_pll_rakor.csv')
    const baris = isi.replace(BOM, '').split('\r\n').filter((b) => b !== '')
    expect(baris[0]).toBe(KOLOM_CSV_SIARAN.join(';'))
    expect(baris).toHaveLength(26)
  })
  it('Admin menarik siaran: banner Ditarik tampil dan tombol Tarik hilang; Peninjau tidak melihat tombolnya', async () => {
    const { user } = pasang('srn_pll_blt')
    await screen.findByRole('table', { name: 'Status per desa' })
    await user.click(screen.getByRole('button', { name: 'Tarik siaran' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Tarik siaran ini?' })
    await user.click(within(dialog).getByRole('button', { name: 'Tarik siaran' }))
    expect(await screen.findByText('Siaran ditarik.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/^Ditarik 24 September 2026 pukul 09\.00 oleh Fajar Ramadhan\./)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Tarik siaran' })).not.toBeInTheDocument()
  })
  it('Peninjau tidak melihat Tarik siaran', async () => {
    pasang('srn_pll_blt', AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: 'Status per desa' })
    expect(screen.queryByRole('button', { name: 'Tarik siaran' })).not.toBeInTheDocument()
  })
  it('isi ber-markup tampil sebagai teks, tanpa elemen gambar (fokus review 1)', async () => {
    ubahDb((d) => {
      const s = d.siaran.find((x) => x.id === 'srn_pll_libur')
      if (s) s.isi = '<img src=x onerror="alert(1)">Rapat'
    })
    pasang('srn_pll_libur')
    const artikel = await screen.findByRole('article', { name: 'Isi siaran' })
    expect(artikel).toHaveTextContent('<img src=x onerror="alert(1)">Rapat')
    expect(artikel.querySelector('img')).toBeNull()
  })
  it('siaran kabupaten lain: tidak ditemukan', async () => {
    pasang('srn_siak_rakor')
    expect(await screen.findByText('Siaran tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke daftar siaran' })).toHaveAttribute('href', '/kabupaten/admin/siaran')
  })
})
