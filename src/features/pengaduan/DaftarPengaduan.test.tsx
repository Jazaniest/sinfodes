import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterPengaduan } from '@/domain/pengaduan/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarPengaduan } from './DaftarPengaduan'
import { FILTER_PENGADUAN_BAWAAN } from './filter-url'

pakaiApiTiruan()

type Peran = 'operator' | 'kadus'
const AKUN: Record<Peran, string> = { operator: AKUN_UJI.operator, kadus: AKUN_UJI.kadus }
const TABEL = { name: 'Kotak masuk pengaduan' }

function pasang(filter: Partial<FilterPengaduan> = {}, peran: Peran = 'operator') {
  masukSebagai(AKUN[peran])
  const onUbahFilter = vi.fn()
  const onBuka = vi.fn()
  renderPanel(
    <DaftarPengaduan filter={{ ...FILTER_PENGADUAN_BAWAAN, ...filter }} onUbahFilter={onUbahFilter} onBuka={onBuka} sekarang={SEKARANG_UJI} />,
    contohSesi(peran),
  )
  return { onUbahFilter, onBuka, user: userEvent.setup() }
}

describe('kotak masuk pengaduan (SPEC §8)', () => {
  it('tab Baru: terlama dulu, berapa lama sudah menunggu; baris membuka pengaduannya', async () => {
    const { onBuka, user } = pasang()
    const tabel = await screen.findByRole('grid', TABEL)
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(2)
    expect(baris[0]).toHaveTextContent('Jalan berlubang di RT 012')
    expect(baris[0]).toHaveTextContent('Zulkifli')
    expect(baris[0]).toHaveTextContent('belum dibalas · 22 jam')
    await user.click(baris[0])
    expect(onBuka).toHaveBeenCalledWith(ambilDb().pengaduan.find((a) => a.pelapor.pendudukId === 'pdk_zulkifli')?.id)
  })
  it('tab status berangka, dan meta kepala halaman', async () => {
    pasang()
    const tab = await screen.findByRole('navigation', { name: 'Status pengaduan' })
    expect(await within(tab).findByRole('link', { name: 'Baru, 2 pengaduan' })).toHaveAttribute('aria-current', 'page')
    expect(within(tab).getByRole('link', { name: 'Selesai, 25 pengaduan' })).toHaveAttribute('href', '/admin/pengaduan?status=selesai')
    expect(screen.getByText('2 baru · 3 ditanggapi · 25 selesai')).toBeInTheDocument()
  })
  it('filter kategori dan dusun (menurut nomornya)', async () => {
    const { onUbahFilter, user } = pasang({ status: 'selesai' })
    await screen.findByRole('grid', TABEL)
    await user.click(screen.getByRole('button', { name: /Kategori/ }))
    await user.click(await screen.findByRole('option', { name: 'Bantuan sosial' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ kategori: 'Bantuan sosial', page: 1 })
    await user.click(screen.getByRole('button', { name: /Dusun/ }))
    await user.click(await screen.findByRole('option', { name: 'Dusun III Teluk Rengas' }))
    expect(onUbahFilter).toHaveBeenLastCalledWith({ dusun: 3, page: 1 })
  })
  it('saringan tanpa hasil → Hapus saringan', async () => {
    // Pengaduan Baru hanya ada di Dusun II dan III.
    const { onUbahFilter, user } = pasang({ dusun: 1 })
    expect(await screen.findByText('Tidak ada pengaduan baru dengan saringan ini')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hapus saringan' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ kategori: undefined, dusun: undefined, page: 1 })
  })
  it('Kepala Dusun II: hanya pengaduan dusunnya, tanpa pilihan dusun (fokus review 1)', async () => {
    pasang({}, 'kadus')
    const tabel = await screen.findByRole('grid', TABEL)
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Dusun/ })).not.toBeInTheDocument()
  })
})
