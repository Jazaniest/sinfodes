import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FilterSuratKeluar } from '@/domain/surat/arsip'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { unduhBerkas } from '@/ui/unduh'
import { DaftarSuratKeluar } from './DaftarSuratKeluar'
import { FILTER_SURAT_KELUAR_BAWAAN } from './filter-url'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))
pakaiApiTiruan()
afterEach(() => vi.clearAllMocks())

function pasang(filter: Partial<FilterSuratKeluar> = {}) {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <DaftarSuratKeluar filter={{ ...FILTER_SURAT_KELUAR_BAWAAN, ...filter }} onUbahFilter={vi.fn()} onBuka={vi.fn()} sekarang={SEKARANG_UJI} />,
    contohSesi('operator'),
  )
  return userEvent.setup()
}
const jumlahTerbit = (bulan: string) => ambilDb().permohonan.filter((p) => p.terbit?.pada.startsWith(bulan)).length

describe('Buku Agenda Surat Keluar (SPEC §7.4 layar 5)', () => {
  it('Unduh CSV: semua baris bulan itu, bukan satu halaman', async () => {
    const user = pasang({ bulan: '2026-08' })
    await screen.findByRole('grid', { name: 'Arsip surat keluar' })
    await user.click(screen.getByRole('button', { name: 'Unduh' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Unduh CSV' }))
    await vi.waitFor(() => expect(unduhBerkas).toHaveBeenCalled())
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('buku-agenda-surat-keluar-2026-08.csv')
    const baris = isi.split('\r\n').filter(Boolean)
    expect(baris[0]).toBe('﻿No.;Nomor surat;Tanggal;Jenis surat;Untuk;Penandatangan;Kanal;Status')
    expect(baris).toHaveLength(jumlahTerbit('2026-08') + 1)
  })
  it('Cetak: dialog cetak dibuka dengan lembar terisi; lembar dilepas setelah cetak', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const user = pasang()
    await screen.findByRole('grid', { name: 'Arsip surat keluar' })
    await user.click(screen.getByRole('button', { name: 'Unduh' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Cetak Buku Agenda Surat Keluar' }))
    const lembar = await screen.findByRole('region', { name: 'Buku Agenda Surat Keluar' })
    expect(cetak).toHaveBeenCalledTimes(1)
    expect(within(lembar).getAllByRole('row')).toHaveLength(jumlahTerbit('2026-09') + 1)
    expect(within(lembar).getByText(/^September 2026 · \d+ surat · dicetak 24 September 2026$/)).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(screen.queryByRole('region', { name: 'Buku Agenda Surat Keluar' })).not.toBeInTheDocument()
  })
  it('bulan atau filter kosong: pilihan unduh nonaktif', async () => {
    const user = pasang({ jenis: 'SPN', penandatangan: 'sekdes' })
    expect(await screen.findByText('Tidak ada surat keluar yang cocok dengan filter ini')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unduh' }))
    expect(await screen.findByRole('menuitem', { name: 'Unduh CSV' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Cetak Buku Agenda Surat Keluar' })).toHaveAttribute('aria-disabled', 'true')
  })
})
