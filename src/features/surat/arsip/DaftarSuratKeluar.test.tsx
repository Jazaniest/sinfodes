import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterSuratKeluar } from '@/domain/surat/arsip'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarSuratKeluar } from './DaftarSuratKeluar'
import { FILTER_SURAT_KELUAR_BAWAAN } from './filter-url'

pakaiApiTiruan()

const TABEL = { name: 'Arsip surat keluar' }

function pasang(filter: Partial<FilterSuratKeluar> = {}) {
  masukSebagai(AKUN_UJI.operator)
  const onUbahFilter = vi.fn()
  const onBuka = vi.fn()
  renderPanel(
    <DaftarSuratKeluar filter={{ ...FILTER_SURAT_KELUAR_BAWAAN, ...filter }} onUbahFilter={onUbahFilter} onBuka={onBuka} sekarang={SEKARANG_UJI} />,
    contohSesi('operator'),
  )
  return { onUbahFilter, onBuka, user: userEvent.setup() }
}
const terbit = (bulan: string) =>
  ambilDb()
    .permohonan.filter((p) => p.terbit?.pada.startsWith(bulan))
    .sort((a, b) => (a.terbit?.urut ?? 0) - (b.terbit?.urut ?? 0))

describe('arsip surat keluar (SPEC §7.4 layar 5)', () => {
  it('bulan berjalan: urut nomor, ringkasan bulan, baris membuka ruang kerja', async () => {
    const { onBuka, user } = pasang()
    expect(screen.getByRole('heading', { level: 1, name: 'Arsip surat' })).toBeInTheDocument()
    const tabel = await screen.findByRole('grid', TABEL)
    const [pertama] = terbit('2026-09')
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris[0]).toHaveTextContent(pertama.terbit?.nomor ?? '-')
    expect(screen.getByText(`September 2026 · ${terbit('2026-09').length} surat keluar`)).toBeInTheDocument()
    await user.click(baris[0])
    expect(onBuka).toHaveBeenCalledWith(pertama.id)
  })
  it('tab modul Arsip dan sub-tab Surat keluar aktif', async () => {
    pasang()
    await screen.findByRole('grid', TABEL)
    const modul = screen.getByRole('navigation', { name: 'Bagian layanan surat' })
    expect(within(modul).getByRole('link', { name: 'Arsip' })).toHaveAttribute('aria-current', 'page')
    const arsip = screen.getByRole('navigation', { name: 'Jenis arsip' })
    expect(within(arsip).getByRole('link', { name: 'Surat keluar' })).toHaveAttribute('aria-current', 'page')
    expect(within(arsip).getByRole('link', { name: 'Surat masuk' })).toHaveAttribute('href', '/admin/surat/arsip/masuk')
  })
  it('pilih bulan lain dan penanda tangan: kembali ke halaman 1', async () => {
    const { onUbahFilter, user } = pasang()
    await screen.findByRole('grid', TABEL)
    await user.click(screen.getByRole('button', { name: /Bulan/ }))
    await user.click(await screen.findByRole('option', { name: 'Agustus 2026' }))
    expect(onUbahFilter).toHaveBeenLastCalledWith({ bulan: '2026-08', page: 1 })
    await user.click(screen.getByRole('button', { name: /Penanda tangan/ }))
    await user.click(await screen.findByRole('option', { name: 'Sekretaris Desa (a.n.)' }))
    expect(onUbahFilter).toHaveBeenLastCalledWith({ penandatangan: 'sekdes', page: 1 })
  })
  it('filter tanpa hasil → Hapus filter', async () => {
    // Surat Pengantar Nikah tidak boleh ditandatangani a.n., jadi kombinasi ini pasti kosong.
    const { onUbahFilter, user } = pasang({ jenis: 'SPN', penandatangan: 'sekdes' })
    expect(await screen.findByText('Tidak ada surat keluar yang cocok dengan filter ini')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hapus filter' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ jenis: undefined, penandatangan: undefined, page: 1 })
  })
})
