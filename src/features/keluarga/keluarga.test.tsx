import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarKeluarga } from './DaftarKeluarga'
import { DetailKeluarga } from './DetailKeluarga'
import { bacaFilterKeluarga, FILTER_KELUARGA_BAWAAN } from './filter-url'

pakaiApiTiruan()

describe('filter keluarga dari URL', () => {
  it('parameter rusak diabaikan', () =>
    expect(bacaFilterKeluarga({ dusun: 'x', pageSize: 50 })).toEqual({ page: 1, pageSize: 50 }))
})

describe('Daftar keluarga (SPEC §6.5)', () => {
  it('806 KK, cari nomor KK lewat POST, klik baris membuka detail', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onBukaKeluarga = vi.fn()
    renderPanel(
      <DaftarKeluarga filter={FILTER_KELUARGA_BAWAAN} onUbahFilter={vi.fn()} onBukaKeluarga={onBukaKeluarga} sekarang={SEKARANG_UJI} />,
      contohSesi(),
    )
    expect(await screen.findByText('806 KK')).toBeInTheDocument()
    expect(await screen.findByText('1–25 dari 806')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('searchbox', { name: 'Cari keluarga' }))
    await user.paste('1405092011238004')
    const baris = await screen.findByRole('row', { name: /Syahrial/ })
    expect(within(baris).getByText('140509 201123 8004')).toBeInTheDocument()
    await user.click(baris)
    expect(onBukaKeluarga).toHaveBeenCalledWith('kk_syahrial')
  })
  it('cari di dalam dusun lain tanpa hasil → dijelaskan, dengan Hapus filter', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onUbahFilter = vi.fn()
    renderPanel(
      <DaftarKeluarga filter={{ ...FILTER_KELUARGA_BAWAAN, dusun: 2 }} onUbahFilter={onUbahFilter} onBukaKeluarga={vi.fn()} sekarang={SEKARANG_UJI} />,
      contohSesi(),
    )
    await screen.findByRole('grid', { name: 'Daftar keluarga' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('searchbox', { name: 'Cari keluarga' }))
    await user.paste('1405092011238004')
    const keterangan = await screen.findByText(/hanya di dalam dusun yang sedang dipilih/)
    await user.click(within(keterangan.parentElement as HTMLElement).getByRole('button', { name: 'Hapus filter' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ dusun: undefined, page: 1 })
  })
})

describe('Detail keluarga (SPEC §6.5)', () => {
  it('ditata seperti kartu KK dengan tabel anggota', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onBukaPenduduk = vi.fn()
    renderPanel(<DetailKeluarga id="kk_syahrial" onBukaPenduduk={onBukaPenduduk} onBukaKeluarga={vi.fn()} />, contohSesi())
    expect(await screen.findByRole('heading', { level: 1, name: 'KK Syahrial' })).toBeInTheDocument()
    const kartu = screen.getByRole('region', { name: 'Kartu Keluarga' })
    expect(within(kartu).getByText('No. 140509 201123 8004')).toBeInTheDocument()
    expect(within(kartu).getByText('Teluk Meranti')).toBeInTheDocument()
    const tabel = screen.getByRole('grid', { name: 'Anggota keluarga' })
    expect(within(tabel).getAllByRole('row')).toHaveLength(5)
    await userEvent.click(within(tabel).getByRole('row', { name: /Siti Rahmah/ }))
    expect(onBukaPenduduk).toHaveBeenCalledWith('pdk_siti_rahmah')
  })
  it('KK dusun lain untuk Kepala Dusun → tidak ditemukan', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<DetailKeluarga id="kk_syahrial" onBukaPenduduk={vi.fn()} onBukaKeluarga={vi.fn()} />, contohSesi('kadus'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Data keluarga tidak ditemukan' })).toBeInTheDocument()
  })
})
