import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { unduhBerkas } from '@/ui/unduh'
import { DaftarPenduduk } from './DaftarPenduduk'
import { FILTER_PENDUDUK_BAWAAN } from './filter-url'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan({ dbSegarTiapUji: true })
// renderPanel tidak memasang penampung toast; uji ini memasangnya sendiri dan mengosongkan antrean sesudahnya.
afterEach(() => kosongkanToast())

function pasang(filter: FilterPenduduk = FILTER_PENDUDUK_BAWAAN) {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <>
      <DaftarPenduduk filter={filter} onUbahFilter={vi.fn()} onBukaProfil={vi.fn()} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi(),
  )
  return userEvent.setup()
}

describe('Unduh daftar penduduk (SPEC §6.2)', { timeout: 20_000 }, () => {
  it('CSV: konfirmasi dulu, lalu berkas titik koma ber-BOM dengan kolom Buku Induk', async () => {
    const user = pasang()
    await screen.findByText('1–25 dari 2.812')
    await user.click(screen.getByRole('button', { name: 'Unduh' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Unduh CSV' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Unduh data penduduk?' })
    expect(dialog).toHaveTextContent('2.812 baris sesuai filter yang aktif')
    await user.click(within(dialog).getByRole('button', { name: 'Unduh CSV' }))
    await vi.waitFor(() => expect(unduhBerkas).toHaveBeenCalled())
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('penduduk-sungaisialang-2026-09-24.csv')
    const baris = isi.split('\r\n')
    expect(baris[0]).toBe(
      '﻿No;Nama lengkap;Jenis kelamin;Status perkawinan;Tempat lahir;Tanggal lahir;Agama;Pendidikan terakhir;Pekerjaan;' +
        'Dapat membaca huruf;Kewarganegaraan;Alamat lengkap;Kedudukan dalam keluarga;NIK;Nomor KK;Keterangan',
    )
    expect(baris).toHaveLength(2812 + 2)
    expect(isi).toContain('="1405095203918002"')
    expect(await screen.findByText('2.812 baris data penduduk diunduh.')).toBeInTheDocument()
  })
  it('Cetak Buku Induk: dialog cetak browser dibuka dengan lembar terisi; lembar dilepas setelah cetak', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const user = pasang({ ...FILTER_PENDUDUK_BAWAAN, preset: 'lansia' })
    await screen.findByRole('grid', { name: 'Daftar penduduk' })
    await user.click(screen.getByRole('button', { name: 'Unduh' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Cetak Buku Induk Penduduk' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Siapkan cetak' }))
    const lembar = await screen.findByRole('region', { name: 'Buku Induk Penduduk' })
    expect(cetak).toHaveBeenCalledTimes(1)
    expect(within(lembar).getAllByRole('row').length).toBeGreaterThan(25)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(screen.queryByRole('region', { name: 'Buku Induk Penduduk' })).not.toBeInTheDocument()
  })
  it('daftar kosong: pilihan unduh nonaktif (fokus review 5)', async () => {
    const user = pasang({ ...FILTER_PENDUDUK_BAWAAN, status: 'Hilang' })
    expect(await screen.findByText('Tidak ada penduduk yang cocok dengan filter ini')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unduh' }))
    expect(await screen.findByRole('menuitem', { name: 'Unduh CSV' })).toHaveAttribute('aria-disabled', 'true')
  })
})
