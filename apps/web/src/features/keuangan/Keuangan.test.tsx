import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Keuangan } from './Keuangan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'kaur-keuangan' ? AKUN_UJI.kaurKeuangan : AKUN_UJI.operator)
  renderPanel(
    <>
      <Keuangan />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}
const kaki = (tabel: HTMLElement) => tabel.querySelector('tfoot')?.textContent ?? ''

describe('Keuangan (SPEC §8)', () => {
  it('penanda sinkron, dan tabel per kelompok dengan baris jumlah yang sama dengan barisnya (fokus review 5)', async () => {
    pasang()
    expect(await screen.findByRole('heading', { level: 1, name: 'APBDes 2026' })).toBeInTheDocument()
    expect(screen.getByText('Disinkronkan dari Siskeudes · 20 Sep 2026 · pukul 14.20 WIB')).toBeInTheDocument()
    const pendapatan = screen.getByRole('table', { name: 'Pendapatan per sumber' })
    expect(pendapatan.querySelectorAll('tbody tr')).toHaveLength(5)
    expect(kaki(pendapatan)).toContain('Rp1.826.650.000')
    const belanja = screen.getByRole('table', { name: 'Belanja per bidang' })
    expect(belanja.querySelectorAll('tbody tr')).toHaveLength(5)
    expect(kaki(belanja)).toContain('Rp1.866.650.000')
    expect(kaki(screen.getByRole('table', { name: 'Pembiayaan' }))).toContain('Pembiayaan netto')
    expect(kaki(screen.getByRole('table', { name: 'Pembiayaan' }))).toContain('Rp40.000.000')
    expect(within(belanja).getByRole('meter', { name: 'Pelaksanaan Pembangunan Desa' })).toBeInTheDocument()
  })
  it('grafik realisasi kumulatif sampai bulan berjalan', async () => {
    pasang()
    const grafik = await screen.findByRole('figure', { name: 'Realisasi kumulatif per bulan' })
    expect(within(grafik).getAllByRole('row')).toHaveLength(10)
    expect(within(grafik).getAllByRole('listitem').map((li) => li.textContent?.split(':')[0])).toEqual(['Pendapatan', 'Belanja'])
  })
  it('Sinkron Siskeudes hanya untuk Kaur Keuangan, dan memperbarui penandanya (fokus review 2)', async () => {
    pasang('operator')
    await screen.findByRole('heading', { level: 1, name: 'APBDes 2026' })
    expect(screen.queryByRole('button', { name: 'Sinkron Siskeudes' })).not.toBeInTheDocument()
  })
  it('Kaur Keuangan menyinkronkan: toast dan penanda waktu baru', async () => {
    const user = pasang('kaur-keuangan')
    await user.click(await screen.findByRole('button', { name: 'Sinkron Siskeudes' }))
    expect(await screen.findByText('APBDes disinkronkan dari Siskeudes.')).toBeInTheDocument()
    expect(await screen.findByText('Disinkronkan dari Siskeudes · 24 Sep 2026 · pukul 09.00 WIB')).toBeInTheDocument()
  })
})
