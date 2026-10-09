import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterMutasi } from '@/domain/mutasi/buku'
import type { Peran } from '@/domain/pengguna/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarMutasi } from './DaftarMutasi'
import { FILTER_MUTASI_BAWAAN } from './filter-url'

pakaiApiTiruan()

function pasang(filter: Partial<FilterMutasi> = {}, peran: Peran = 'operator') {
  masukSebagai(peran === 'kades' ? AKUN_UJI.kades : AKUN_UJI.operator)
  const onUbahFilter = vi.fn()
  const onBukaPenduduk = vi.fn()
  const hasil = renderPanel(
    <DaftarMutasi
      filter={{ ...FILTER_MUTASI_BAWAAN, ...filter }}
      onUbahFilter={onUbahFilter}
      onBukaPenduduk={onBukaPenduduk}
      sekarang={SEKARANG_UJI}
    />,
    contohSesi(peran),
  )
  return { ...hasil, onUbahFilter, onBukaPenduduk, user: userEvent.setup() }
}

describe('Buku Mutasi (SPEC §6.6)', () => {
  it('ringkasan bulan berjalan di kepala halaman; mutasi bulan ini', async () => {
    pasang({ bulan: '2026-09' })
    expect(await screen.findByText('September 2026: 3 lahir · 1 meninggal · 2 datang · 4 pindah')).toBeInTheDocument()
    const tabel = await screen.findByRole('grid', { name: 'Buku mutasi' })
    expect(within(tabel).getAllByRole('row')).toHaveLength(11)
    expect(screen.getByText('1–10 dari 10')).toBeInTheDocument()
  })
  it('chip jenis mengubah filter dan kembali ke halaman 1', async () => {
    const { user, onUbahFilter } = pasang()
    await user.click(screen.getByRole('radio', { name: 'Lahir' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ jenis: 'lahir', page: 1 })
  })
  it('filter tanpa hasil → Hapus filter', async () => {
    const { user, onUbahFilter } = pasang({ bulan: '2023-01' })
    expect(await screen.findByText('Tidak ada mutasi yang cocok dengan filter ini')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hapus filter' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ jenis: undefined, bulan: undefined, page: 1 })
  })
  it('klik baris membuka profil penduduk pertamanya', async () => {
    const { user, onBukaPenduduk } = pasang({ bulan: '2026-09', jenis: 'lahir' })
    const tabel = await screen.findByRole('grid', { name: 'Buku mutasi' })
    await user.click(within(tabel).getAllByRole('row')[1])
    expect(onBukaPenduduk).toHaveBeenCalledWith(expect.stringMatching(/^pdk_/))
  })
  it('menu Catat mutasi berisi empat alur untuk operator, dan tidak tampil untuk Kepala Desa', async () => {
    const { user, unmount } = pasang()
    await user.click(screen.getByRole('button', { name: 'Catat mutasi' }))
    expect(await screen.findByRole('menuitem', { name: 'Kelahiran' })).toHaveAttribute('href', '/admin/kependudukan/mutasi/lahir')
    expect(screen.getAllByRole('menuitem')).toHaveLength(4)
    unmount()
    pasang({}, 'kades')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mutasi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Catat mutasi' })).not.toBeInTheDocument()
  })
})
