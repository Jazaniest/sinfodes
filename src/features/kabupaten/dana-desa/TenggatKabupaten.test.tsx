import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TenggatKabupaten } from './TenggatKabupaten'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(id)
  renderKabupaten(
    <>
      <TenggatKabupaten sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesiKabupaten(id),
  )
  return userEvent.setup()
}

describe('tenggat laporan di Dana Desa (SPEC-V0.2 §8.3 butir 4)', () => {
  it('dua daftar: akan datang dan sudah lewat, dengan sisa hari dan jumlah desa yang sudah mengirim', async () => {
    pasang(AKUN_KABUPATEN_UJI.peninjau)
    const akan = await screen.findByRole('list', { name: 'Akan datang' })
    const baris = within(akan).getAllByRole('listitem')
    expect(baris).toHaveLength(2)
    expect(baris[0]).toHaveTextContent('Laporan realisasi Dana Desa tahap II 2026')
    expect(baris[0]).toHaveTextContent('30 September 2026')
    expect(baris[0]).toHaveTextContent('6 hari lagi')
    expect(baris[0]).toHaveTextContent(/\d+ dari 25 desa sudah mengirim/)
    expect(within(baris[0]).getByRole('link', { name: 'Laporan realisasi Dana Desa tahap II 2026' })).toHaveAttribute(
      'href', '/kabupaten/admin/dana-desa/tenggat/tgt_pll_dd2',
    )
    const lewat = screen.getByRole('list', { name: 'Sudah lewat' })
    expect(within(lewat).getAllByRole('listitem')[0]).toHaveTextContent('Laporan realisasi APBDes semester I 2026')
    expect(screen.queryByRole('button', { name: 'Tambah tenggat' })).not.toBeInTheDocument()
  })
  it('Admin menambah tenggat: galat tanggal tampil di isiannya; berhasil → toast dan daftar diperbarui', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Tambah tenggat' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah tenggat' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Nama laporan/ }), 'Laporan konsolidasi BLT-DD')
    await user.click(within(within(dialog).getByRole('group', { name: /Tanggal tenggat/ })).getAllByRole('spinbutton')[0])
    await user.keyboard('20092026')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await within(dialog).findByText('Tanggal tenggat tidak boleh sebelum hari ini.')).toBeInTheDocument()
    await user.click(within(within(dialog).getByRole('group', { name: /Tanggal tenggat/ })).getAllByRole('spinbutton')[0])
    await user.keyboard('15102026')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(
      await screen.findByText('Tenggat ditambahkan. Desa melihat pengingatnya mulai 14 hari sebelum tanggal itu.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Akan datang' })).getAllByRole('listitem')).toHaveLength(3))
    expect(within(screen.getByRole('list', { name: 'Akan datang' })).getAllByRole('listitem')[1]).toHaveTextContent('Laporan konsolidasi BLT-DD')
  })
  it('nama kosong ditolak di peramban sebelum dikirim', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Tambah tenggat' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah tenggat' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getByText('Nama laporan wajib diisi')).toBeInTheDocument()
    expect(within(dialog).getByText('Pilih tanggal tenggat')).toBeInTheDocument()
  })
})
