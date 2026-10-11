import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterBalita } from '@/domain/kesehatan/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { FILTER_BALITA_BAWAAN } from './filter-url'
import { Kesehatan } from './Kesehatan'

pakaiApiTiruan()

function pasang(filter: Partial<FilterBalita> = {}, peran: 'operator' | 'kadus' = 'operator') {
  masukSebagai(peran === 'kadus' ? AKUN_UJI.kadus : AKUN_UJI.operator)
  const onUbahFilter = vi.fn()
  renderPanel(<Kesehatan filter={{ ...FILTER_BALITA_BAWAAN, ...filter }} onUbahFilter={onUbahFilter} sekarang={SEKARANG_UJI} />, contohSesi(peran))
  return { onUbahFilter, user: userEvent.setup() }
}
async function barisAlif() {
  const tabel = await screen.findByRole('grid', { name: 'Pemantauan balita' })
  const baris = within(tabel)
    .getAllByRole('row')
    .find((r) => r.textContent?.includes('Muhammad Alif'))
  if (!baris) throw new Error('Muhammad Alif tidak ada di tabel')
  return baris
}

describe('Kesehatan (SPEC §8)', () => {
  it('posyandu: jadwal bulan ini dan jumlah balita; baris posyandu menyaring balita', async () => {
    const { onUbahFilter, user } = pasang()
    const posyandu = await screen.findByRole('grid', { name: 'Posyandu' })
    const baris = within(posyandu).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(4)
    expect(baris[0]).toHaveTextContent('Posyandu Melati')
    expect(baris[0]).toHaveTextContent('Selasa, 8 September 2026')
    expect(baris[0]).toHaveTextContent('Selasa pekan kedua · berikutnya 13 Okt 2026')
    expect(await screen.findByText('211 balita · 4 posyandu')).toBeInTheDocument()
    await user.click(baris[1])
    expect(onUbahFilter).toHaveBeenCalledWith({ posyandu: 'psy_ss_2', page: 1 })
  })
  it('balita: umur, ibu, pengukuran terakhir, dan status; chip status menyaring', async () => {
    const { onUbahFilter, user } = pasang({ posyandu: 'psy_ss_1', pageSize: 100 })
    const alif = await barisAlif()
    expect(alif).toHaveTextContent('34 bulan')
    expect(alif).toHaveTextContent('Siti Rahmah')
    expect(alif).toHaveTextContent('8 Sep 2026')
    expect(alif).toHaveTextContent('Normal')
    await user.click(screen.getByRole('radio', { name: 'Pendek (stunting)' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ status: 'pendek', page: 1 })
  })
  it('laci balita: riwayat pengukuran terbaru dulu, dan tautan ke profilnya', async () => {
    const { user } = pasang({ posyandu: 'psy_ss_1', pageSize: 100 })
    await user.click(await barisAlif())
    const laci = await screen.findByRole('dialog', { name: 'Muhammad Alif' })
    const riwayat = within(laci).getByRole('table', { name: 'Riwayat pengukuran' })
    const baris = within(riwayat).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(12)
    expect(baris[0]).toHaveTextContent('8 Sep 2026')
    expect(within(laci).getByRole('link', { name: 'Buka profil penduduk' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk/pdk_muhammad_alif',
    )
  })
  it('Kepala Dusun II: satu posyandu dan tanpa pilihan posyandu (fokus review 1)', async () => {
    pasang({}, 'kadus')
    const posyandu = await screen.findByRole('grid', { name: 'Posyandu' })
    expect(within(posyandu).getAllByRole('row').slice(1)).toHaveLength(1)
    expect(within(posyandu).getByText('Posyandu Mawar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Posyandu/ })).not.toBeInTheDocument()
  })
})
