import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh bisa melewati 3 detik bawaan saat seluruh suite berjalan paralel di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan?bagian=susunan&halaman=menu')
  return userEvent.setup({ applyAccept: false })
}

describe('Penyunting menu website (rencana 7F-2 Tugas 5)', () => {
  it('saklar Tampil untuk setiap halaman sistem; Layanan dan Cek surat nonaktif dengan keterangan Wajib ada', async () => {
    pasang()
    const layanan = await screen.findByRole('switch', { name: 'Tampil: Layanan' })
    expect(layanan).toBeDisabled()
    expect(screen.getAllByText('Wajib ada')).toHaveLength(2)
    expect(screen.getByRole('switch', { name: 'Tampil: Cek surat' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Tampil: Statistik' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Tambah tautan luar' })).toBeEnabled()
  })
  it('sembunyikan Statistik: draf menu berubah dan setelah Terbitkan menu publik tidak memuat Statistik', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('switch', { name: 'Tampil: Statistik' }))
    expect(await screen.findByText('Draf tersimpan pukul 09.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Terbitkan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Terbitkan website?' })
    await user.click(within(dialog).getByRole('button', { name: 'Terbitkan' }))
    expect(await screen.findByText('Website diterbitkan.')).toBeInTheDocument()
    const publik = await ambilIdentitasPublik('sungaisialang')
    expect(publik.menu.map((m) => m.label)).not.toContain('Statistik')
  })
  it('tombol Tambah tautan luar nonaktif setelah dua tautan; dialog menolak URL javascript:', async () => {
    const user = pasang()
    const tombol = await screen.findByRole('button', { name: 'Tambah tautan luar' })
    await user.click(tombol)
    let dialog = await screen.findByRole('dialog', { name: 'Tambah tautan luar' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Label tautan' }), 'Situs Kecamatan')
    await user.type(within(dialog).getByRole('textbox', { name: 'Alamat tautan' }), 'javascript:alert(1)')
    await user.click(within(dialog).getByRole('button', { name: 'Tambah tautan luar' }))
    expect(await within(dialog).findByText('Tautan harus diawali http:// atau https://.')).toBeInTheDocument()
    const alamat = within(dialog).getByRole('textbox', { name: 'Alamat tautan' })
    await user.clear(alamat)
    await user.type(alamat, 'https://kecamatan.example.id')
    await user.click(within(dialog).getByRole('button', { name: 'Tambah tautan luar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah tautan luar' })).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Tambah tautan luar' }))
    dialog = await screen.findByRole('dialog', { name: 'Tambah tautan luar' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Label tautan' }), 'Situs BPD')
    await user.type(within(dialog).getByRole('textbox', { name: 'Alamat tautan' }), 'https://bpd.example.id')
    await user.click(within(dialog).getByRole('button', { name: 'Tambah tautan luar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah tautan luar' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Tambah tautan luar' })).toBeDisabled()
  })
})
