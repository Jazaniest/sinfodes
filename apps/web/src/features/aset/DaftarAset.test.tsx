import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterAset } from '@/domain/aset/schema'
import { formatRupiah } from '@/domain/format/angka'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarAset } from './DaftarAset'

pakaiApiTiruan()

function pasang(filter: FilterAset = {}) {
  masukSebagai(AKUN_UJI.kades)
  const onUbahFilter = vi.fn()
  renderPanel(<DaftarAset filter={filter} onUbahFilter={onUbahFilter} />, contohSesi('kades'))
  return { onUbahFilter, user: userEvent.setup() }
}

describe('Aset Desa (SPEC §8)', () => {
  it('inventaris lengkap; jumlah nilai perolehan sama dengan jumlah barisnya (fokus review 5)', async () => {
    pasang()
    const tabel = await screen.findByRole('grid', { name: 'Inventaris aset desa' })
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(40)
    const nilai = ambilDb().aset.reduce((n, a) => n + a.nilaiPerolehan, 0)
    expect(screen.getByText(/^Jumlah:/)).toHaveTextContent(`Jumlah: 40 aset · nilai perolehan ${formatRupiah(nilai)}`)
  })
  it('chip kategori menyaring lewat URL; tanah kas desa dan tanah kantor', async () => {
    const { onUbahFilter, user } = pasang({ kategori: 'Tanah' })
    const tabel = await screen.findByRole('grid', { name: 'Inventaris aset desa' })
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(2)
    expect(screen.getByText(/^Jumlah:/)).toHaveTextContent('Jumlah: 2 aset · nilai perolehan Rp555.000.000')
    await user.click(screen.getByRole('radio', { name: 'Semua kategori' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ kategori: undefined })
  })
  it('kondisi tampil sebagai Cap bertulisan', async () => {
    pasang({ kategori: 'Peralatan' })
    const tabel = await screen.findByRole('grid', { name: 'Inventaris aset desa' })
    const kamera = within(tabel).getAllByRole('row').find((r) => r.textContent?.includes('Kamera digital'))
    expect(kamera).toHaveTextContent('Rusak berat')
  })
})
