import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterPenerima } from '@/domain/bansos/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarProgram } from './DaftarProgram'
import { DetailProgram } from './DetailProgram'
import { FILTER_PENERIMA_BAWAAN } from './filter-url'

pakaiApiTiruan()

function pasangDetail(id: string, filter: Partial<FilterPenerima> = {}, peran: 'operator' | 'kadus' = 'operator') {
  masukSebagai(peran === 'kadus' ? AKUN_UJI.kadus : AKUN_UJI.operator)
  const onUbahFilter = vi.fn()
  const onBukaPenduduk = vi.fn()
  renderPanel(
    <DetailProgram
      id={id}
      filter={{ ...FILTER_PENERIMA_BAWAAN, ...filter }}
      onUbahFilter={onUbahFilter}
      onBukaPenduduk={onBukaPenduduk}
      sekarang={SEKARANG_UJI}
    />,
    contohSesi(peran),
  )
  return { onUbahFilter, onBukaPenduduk, user: userEvent.setup() }
}

describe('Bantuan Sosial (SPEC §8)', () => {
  it('daftar program: jumlah KPM, penyaluran berikutnya, dan yang perlu ditinjau; baris membuka programnya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onBuka = vi.fn()
    renderPanel(<DaftarProgram onBuka={onBuka} sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    const tabel = await screen.findByRole('grid', { name: 'Program bantuan sosial' })
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(3)
    expect(baris[0]).toHaveTextContent('BLT Dana Desa 2026')
    expect(baris[0]).toHaveTextContent('38 KPM')
    expect(baris[0]).toHaveTextContent('Tahap III · 30 Sep 2026')
    expect(baris[0]).toHaveTextContent('1 perlu ditinjau')
    expect(baris[1]).toHaveTextContent('Tahap IV · 11 Des 2026')
    await userEvent.setup().click(baris[0])
    expect(onBuka).toHaveBeenCalledWith('bns_ss_blt')
  })
  it('detail program: jadwal tahap, kolom per tahap, dan ajakan meninjau', async () => {
    const { onUbahFilter, user } = pasangDetail('bns_ss_blt')
    expect(await screen.findByRole('heading', { level: 1, name: 'BLT Dana Desa 2026' })).toBeInTheDocument()
    const jadwal = screen.getByRole('list', { name: 'Jadwal penyaluran' })
    expect(within(jadwal).getAllByRole('listitem')[0]).toHaveTextContent('Tahap I · Januari–Maret · 31 Mar 2026 · sudah disalurkan')
    expect(within(jadwal).getAllByRole('listitem')[2]).toHaveTextContent('Tahap III · Juli–September · 30 Sep 2026 · berikutnya')
    const tabel = await screen.findByRole('grid', { name: 'Penerima BLT-DD' })
    expect(within(tabel).getByRole('columnheader', { name: 'Tahap III' })).toBeInTheDocument()
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(25)
    await user.click(screen.getByRole('button', { name: 'Tampilkan yang perlu ditinjau' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ tampil: 'perlu-ditinjau', page: 1 })
  })
  it('penerima yang perlu ditinjau: alasan tampil, tahap yang belum tersalur Ditahan; baris membuka profilnya', async () => {
    const { onBukaPenduduk, user } = pasangDetail('bns_ss_blt', { tampil: 'perlu-ditinjau' })
    const tabel = await screen.findByRole('grid', { name: 'Penerima BLT-DD' })
    const [baris] = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveTextContent(/Penerima meninggal dunia pada/)
    expect(within(baris).getAllByText('Ditahan')).toHaveLength(2)
    await user.click(baris)
    expect(onBukaPenduduk).toHaveBeenCalledTimes(1)
  })
  it('PKH: data kementerian disebutkan; Kepala Dusun II hanya penerima dusunnya, tanpa pilihan dusun (fokus review 1)', async () => {
    pasangDetail('bns_ss_pkh', {}, 'kadus')
    expect(await screen.findByText(/^Data penerima dari Kementerian Sosial/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dusun/ })).not.toBeInTheDocument()
    const tabel = await screen.findByRole('grid', { name: 'Penerima PKH' })
    for (const baris of within(tabel).getAllByRole('row').slice(1)) expect(baris).toHaveTextContent('Dusun II')
  })
  it('program tidak ada → tidak ditemukan', async () => {
    pasangDetail('bns_xx')
    expect(await screen.findByText('Program bantuan tidak ditemukan')).toBeInTheDocument()
  })
})
