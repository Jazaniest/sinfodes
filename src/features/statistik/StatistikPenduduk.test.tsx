import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BOM } from '@/domain/format/csv'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { unduhBerkas } from '@/ui/unduh'
import { StatistikPenduduk } from './StatistikPenduduk'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan()

describe('Statistik penduduk (SPEC §6.7)', { timeout: 20_000 }, () => {
  it('ringkasan di kepala halaman; batang menjadi tautan ke daftar terfilter', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<StatistikPenduduk dusun={null} onUbahDusun={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByText('2.812 jiwa · 1.431 laki-laki · 1.381 perempuan · 806 KK')).toBeInTheDocument()
    const agama = screen.getByRole('list', { name: 'Agama' })
    expect(within(agama).getByRole('link', { name: /^Islam: [\d.]+ jiwa\. Buka daftar penduduk$/ })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk?agama=Islam',
    )
    expect(screen.getByRole('link', { name: /^60–64 tahun, laki-laki: / })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk?jk=L&umurMin=60&umurMax=64',
    )
    expect(screen.getByRole('link', { name: /^Dusun II Sialang Jaya: / })).toHaveAttribute('href', '/admin/kependudukan/penduduk?dusun=2')
  })
  it('pilih dusun; lihat sebagai tabel; unduh CSV', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onUbahDusun = vi.fn()
    renderPanel(<StatistikPenduduk dusun={null} onUbahDusun={onUbahDusun} sekarang={SEKARANG_UJI} />, contohSesi())
    await screen.findByRole('list', { name: 'Agama' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Semua dusun/ }))
    await user.click(await screen.findByRole('option', { name: 'Dusun III Teluk Rengas' }))
    expect(onUbahDusun).toHaveBeenCalledWith(3)
    await user.click(screen.getByRole('checkbox', { name: 'Lihat sebagai tabel' }))
    const tabel = screen.getByRole('table', { name: 'Agama' })
    expect(within(tabel).getByRole('link', { name: 'Islam' })).toHaveAttribute('href', '/admin/kependudukan/penduduk?agama=Islam')
    await user.click(screen.getByRole('button', { name: 'Unduh CSV' }))
    expect(unduhBerkas).toHaveBeenCalledWith(
      'statistik-penduduk-sungaisialang-2026-09-24.csv',
      expect.stringMatching(new RegExp(`^${BOM}Statistik penduduk;Desa Sungai Sialang\\r\\nJiwa;2812\\r\\n`)),
    )
  })
  it('Kepala Dusun: tanpa pilihan dusun; tautan membawa dusunnya', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<StatistikPenduduk dusun={null} onUbahDusun={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi('kadus'))
    expect(await screen.findByText(/ · Dusun II Sialang Jaya$/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Semua dusun/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Jumlah per dusun' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Agama' })).getByRole('link', { name: /^Islam/ })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk?dusun=2&agama=Islam',
    )
  })
})
