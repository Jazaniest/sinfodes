import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarLembaga } from './DaftarLembaga'

pakaiApiTiruan()

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'kaur-keuangan' ? AKUN_UJI.kaurKeuangan : AKUN_UJI.operator)
  renderPanel(<DaftarLembaga />, contohSesi(peran))
  return userEvent.setup()
}

describe('Lembaga Desa (SPEC §8)', () => {
  it('tab per lembaga dengan jumlah pengurus; Perangkat Desa terbuka pertama', async () => {
    pasang()
    const tab = await screen.findByRole('tablist', { name: 'Lembaga desa' })
    expect(within(tab).getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Perangkat Desa (14)', 'BPD (7)', 'LPM (5)', 'PKK (8)', 'Karang Taruna (6)', 'RT dan RW (28)', 'Kader Posyandu (16)', 'Linmas (10)', 'BUMDes (4)',
    ])
    const tabel = screen.getByRole('table', { name: 'Perangkat Desa' })
    const [kades, sekdes] = within(tabel).getAllByRole('row').slice(1)
    expect(kades).toHaveTextContent('H. Muhammad Nasir')
    expect(kades).toHaveTextContent('Kepala Desa')
    expect(kades).toHaveTextContent('2021–2029')
    expect(sekdes).toHaveTextContent('sejak 2017')
  })
  it('nama yang tercatat sebagai penduduk bertaut ke profilnya, hanya untuk peran yang boleh melihat penduduk', async () => {
    const user = pasang('operator')
    await user.click(await screen.findByRole('tab', { name: 'BPD (7)' }))
    const tabel = await screen.findByRole('table', { name: 'Badan Permusyawaratan Desa' })
    expect(within(tabel).getAllByRole('link')[0].getAttribute('href')).toMatch(/^\/admin\/kependudukan\/penduduk\/pdk_/)
  })
  it('Kaur Keuangan melihat nama tanpa tautan profil', async () => {
    const user = pasang('kaur-keuangan')
    await user.click(await screen.findByRole('tab', { name: 'BPD (7)' }))
    const tabel = await screen.findByRole('table', { name: 'Badan Permusyawaratan Desa' })
    expect(within(tabel).queryAllByRole('link')).toHaveLength(0)
  })
  it('RT dan RW menampilkan kolom dusun', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('tab', { name: 'RT dan RW (28)' }))
    const tabel = await screen.findByRole('table', { name: 'Ketua RT dan RW' })
    expect(within(tabel).getByRole('columnheader', { name: 'Dusun' })).toBeInTheDocument()
    expect(within(tabel).getAllByRole('row')[1]).toHaveTextContent('Ketua RW 001')
    expect(within(tabel).getAllByRole('row')[1]).toHaveTextContent('Dusun I')
  })
})
