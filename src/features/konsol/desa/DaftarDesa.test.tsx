import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterDesaKonsol } from '@/domain/konsol/schema'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { DaftarDesa } from './DaftarDesa'

pakaiApiTiruan()

function pasang(filter: FilterDesaKonsol = {}) {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  const onUbahFilter = vi.fn()
  const onBukaDesa = vi.fn()
  renderKonsol(<DaftarDesa filter={filter} onUbahFilter={onUbahFilter} onBukaDesa={onBukaDesa} sekarang={SEKARANG_UJI} />)
  return { onUbahFilter, onBukaDesa, user: userEvent.setup() }
}

describe('Daftar desa Konsol (SPEC §11)', () => {
  it('47 desa dengan kolom SPEC; baris membuka detail desa; tombol Tambah desa', async () => {
    const { onBukaDesa, user } = pasang()
    const tabel = await screen.findByRole('grid', { name: 'Daftar desa' })
    const baris = within(tabel).getAllByRole('row')
    expect(within(baris[0]).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Desa', 'Alamat', 'Kecamatan · Kabupaten', 'Status', 'Paket', 'Pengguna aktif', 'Aktivitas terakhir',
    ])
    expect(baris.slice(1)).toHaveLength(47)
    const ss = baris.find((r) => r.textContent?.includes('Sungai Sialang'))
    expect(ss).toHaveTextContent('Teluk Meranti · Pelalawan')
    expect(within(ss as HTMLElement).getByRole('link', { name: 'sungaisialang.sinfodes.localhost' })).toHaveAttribute(
      'href',
      'http://sungaisialang.sinfodes.localhost:3000/',
    )
    const tl = baris.find((r) => r.textContent?.includes('Tanjung Lamo'))
    expect(tl).toHaveTextContent('Belum ada')
    if (!ss) throw new Error('Baris Sungai Sialang tidak ada')
    await user.click(ss)
    expect(onBukaDesa).toHaveBeenCalledWith('desa_sungai_sialang')
    expect(screen.getByText('47 desa pelanggan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tambah desa' })).toHaveAttribute('href', '/konsol/desa/baru')
  })
  it('filter status dan paket menyaring lewat alamat halaman; provinsi baru mengosongkan kabupaten', async () => {
    const { onUbahFilter, user } = pasang({ status: 'Persiapan' })
    const tabel = await screen.findByRole('grid', { name: 'Daftar desa' })
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(7)
    await user.click(screen.getByRole('button', { name: /Paket$/ }))
    await user.click(await screen.findByRole('option', { name: 'Lengkap' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ paket: 'Lengkap' })
    await user.click(screen.getByRole('button', { name: /Provinsi$/ }))
    await user.click(await screen.findByRole('option', { name: 'Riau' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ provinsi: '14', kabupaten: undefined })
  })
  it('filter tanpa hasil: keterangan dan tombol Hapus filter', async () => {
    const { onUbahFilter, user } = pasang({ kabupaten: '14.08', status: 'Persiapan' })
    expect(await screen.findByText('Tidak ada desa yang cocok')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hapus filter' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ provinsi: undefined, kabupaten: undefined, status: undefined, paket: undefined })
  })
})
