import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { PenggunaDesa } from './PenggunaDesa'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.sekdes)
  renderPanel(
    <>
      <PenggunaDesa />
      <PenampungToast />
    </>,
    contohSesi('sekdes'),
  )
  return userEvent.setup()
}
// Nama tombol Select adalah "nilai label", mis. "Kepala Dusun Peran"; karena itu regexnya diakhiri label.
async function pilihDi(user: UserEvent, akar: HTMLElement, label: RegExp, opsi: string) {
  await user.click(within(akar).getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}
/** Baris pengguna; menunggu daftar dimuat (ulang) sampai barisnya ada. */
function barisPengguna(nama: string) {
  return waitFor(() => {
    const tabel = screen.getByRole('grid', { name: 'Pengguna desa' })
    const baris = within(tabel).getAllByRole('row').find((r) => r.textContent?.includes(nama))
    if (!baris) throw new Error(`Baris ${nama} tidak ada`)
    return baris
  })
}

describe('Pengaturan › Pengguna (SPEC §8)', () => {
  it('daftar pengguna dengan peran dan status; akun sendiri tanpa menu aksi (fokus review 2)', async () => {
    pasang()
    const tabel = await screen.findByRole('grid', { name: 'Pengguna desa' })
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(5)
    const saya = await barisPengguna('Hendri Saputra')
    expect(saya).toHaveTextContent('Akun Anda')
    expect(within(saya).queryByRole('button', { name: /Aksi untuk/ })).not.toBeInTheDocument()
    expect(await barisPengguna('Rosmiati')).toHaveTextContent('Aktif')
  })
  it('undang lewat dialog: Kepala Dusun wajib memilih dusun; berhasil → toast dan baris baru', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Undang pengguna' }))
    const dialog = screen.getByRole('dialog', { name: 'Undang pengguna' })
    await user.type(within(dialog).getByRole('textbox', { name: /Nama/ }), 'Amran')
    await user.type(within(dialog).getByRole('textbox', { name: /Surel/ }), 'amran@sungaisialang.desa.id')
    await pilihDi(user, dialog, /Peran$/, 'Kepala Dusun')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim undangan' }))
    expect(await within(dialog).findByText('Pilih dusun untuk Kepala Dusun')).toBeInTheDocument()
    await pilihDi(user, dialog, /Dusun$/, 'Dusun I Kampung Tengah')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim undangan' }))
    expect(await screen.findByText('Undangan dikirim ke amran@sungaisialang.desa.id.')).toBeInTheDocument()
    expect(await barisPengguna('Amran')).toHaveTextContent('Kepala Dusun I')
  })
  it('surel yang sudah dipakai ditandai di isiannya', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Undang pengguna' }))
    const dialog = screen.getByRole('dialog', { name: 'Undang pengguna' })
    await user.type(within(dialog).getByRole('textbox', { name: /Nama/ }), 'Rosmiati Dua')
    await user.type(within(dialog).getByRole('textbox', { name: /Surel/ }), 'rosmiati@sungaisialang.desa.id')
    await pilihDi(user, dialog, /Peran$/, 'Operator')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim undangan' }))
    expect(await within(dialog).findByText('Surel ini sudah dipakai Rosmiati.')).toBeInTheDocument()
  })
  it('Kepala Desa kedua ditolak dengan pesan; nonaktifkan lewat konfirmasi, lalu aktifkan lagi (fokus review 2)', async () => {
    const user = pasang()
    await user.click(within(await barisPengguna('Rosmiati')).getByRole('button', { name: 'Aksi untuk Rosmiati' }))
    await user.click(screen.getByRole('menuitem', { name: 'Ganti peran…' }))
    const dialog = screen.getByRole('dialog', { name: 'Ganti peran Rosmiati' })
    await pilihDi(user, dialog, /Peran$/, 'Kepala Desa')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await within(dialog).findByText(/Sudah ada Kepala Desa aktif: H\. Muhammad Nasir/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    await user.click(within(await barisPengguna('Nurhayati')).getByRole('button', { name: 'Aksi untuk Nurhayati' }))
    await user.click(screen.getByRole('menuitem', { name: 'Nonaktifkan…' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Nonaktifkan' }))
    expect(await screen.findByText('Nurhayati dinonaktifkan dan tidak bisa masuk lagi.')).toBeInTheDocument()
    expect(ambilDb().pengguna.find((p) => p.id === 'pgn_nurhayati')?.aktif).toBe(false)
    // Daftar dimuat ulang sesudah perubahan; Cap "Nonaktif" muncul sesudah itu.
    expect(await screen.findByText('Nonaktif')).toBeInTheDocument()

    await user.click(within(await barisPengguna('Nurhayati')).getByRole('button', { name: 'Aksi untuk Nurhayati' }))
    await user.click(screen.getByRole('menuitem', { name: 'Aktifkan lagi' }))
    expect(await screen.findByText('Nurhayati aktif kembali dan bisa masuk.')).toBeInTheDocument()
  })
})
