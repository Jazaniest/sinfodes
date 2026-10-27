import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { HalamanPenggunaKabupaten } from './HalamanPenggunaKabupaten'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(id)
  renderKabupaten(
    <>
      <HalamanPenggunaKabupaten />
      <PenampungToast />
    </>,
    contohSesiKabupaten(id),
  )
  return userEvent.setup()
}
// Nama tombol Select adalah "nilai label", mis. "Peninjau Peran"; karena itu regexnya diakhiri label.
async function pilihDi(user: UserEvent, akar: HTMLElement, label: RegExp, opsi: string) {
  await user.click(within(akar).getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}
function barisPengguna(nama: string) {
  return waitFor(() => {
    const tabel = screen.getByRole('grid', { name: 'Pengguna kabupaten' })
    const baris = within(tabel).getAllByRole('row').find((r) => r.textContent?.includes(nama))
    if (!baris) throw new Error(`Baris ${nama} tidak ada`)
    return baris
  })
}

describe('Pengguna di dasbor kabupaten (SPEC-V0.2 §8.1)', () => {
  it('tabel akun kabupaten sendiri; akun sendiri tanpa menu aksi', async () => {
    pasang()
    expect(screen.getByRole('heading', { level: 1, name: 'Pengguna' })).toBeInTheDocument()
    const tabel = await screen.findByRole('grid', { name: 'Pengguna kabupaten' })
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(2)
    const saya = await barisPengguna('Fajar Ramadhan')
    expect(saya).toHaveTextContent('Akun Anda')
    expect(saya).toHaveTextContent('Admin Kabupaten')
    expect(within(saya).queryByRole('button', { name: /Aksi untuk/ })).not.toBeInTheDocument()
    const rosnani = await barisPengguna('Hj. Rosnani')
    expect(rosnani).toHaveTextContent('pmd.pelalawan@demo.sinfodes.id')
    expect(rosnani).toHaveTextContent('Kepala Dinas PMD Kabupaten Pelalawan')
    expect(rosnani).toHaveTextContent('Aktif')
  })
  it('Tambah pengguna: peran wajib; berhasil → toast dan baris baru', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Tambah pengguna' }))
    const dialog = screen.getByRole('dialog', { name: 'Tambah pengguna' })
    await user.type(within(dialog).getByRole('textbox', { name: /Nama/ }), 'H. Zulmi')
    await user.type(within(dialog).getByRole('textbox', { name: /Jabatan/ }), 'Bupati Pelalawan')
    await user.type(within(dialog).getByRole('textbox', { name: /Email/ }), 'zulmi@pelalawan.go.id')
    await user.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))
    expect(await within(dialog).findByText('Pilih peran')).toBeInTheDocument()
    await pilihDi(user, dialog, /Peran$/, 'Peninjau')
    await user.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))
    expect(await screen.findByText('Undangan dikirim ke zulmi@pelalawan.go.id.')).toBeInTheDocument()
    expect(await barisPengguna('H. Zulmi')).toHaveTextContent('Bupati Pelalawan')
  })
  it('email yang sudah dipakai ditandai di isiannya', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Tambah pengguna' }))
    const dialog = screen.getByRole('dialog', { name: 'Tambah pengguna' })
    await user.type(within(dialog).getByRole('textbox', { name: /Nama/ }), 'Wahyu Kedua')
    await user.type(within(dialog).getByRole('textbox', { name: /Email/ }), 'admin.siak@demo.sinfodes.id')
    await pilihDi(user, dialog, /Peran$/, 'Admin Kabupaten')
    await user.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))
    expect(await within(dialog).findByText('Email ini sudah dipakai akun lain.')).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: /Email/ })).toHaveFocus())
  })
  it('Ganti peran, Nonaktifkan lewat konfirmasi, lalu Aktifkan lagi', async () => {
    const user = pasang()
    await user.click(within(await barisPengguna('Hj. Rosnani')).getByRole('button', { name: 'Aksi untuk Hj. Rosnani' }))
    await user.click(screen.getByRole('menuitem', { name: 'Ganti peran…' }))
    const dialog = screen.getByRole('dialog', { name: 'Ganti peran Hj. Rosnani' })
    await pilihDi(user, dialog, /Peran$/, 'Admin Kabupaten')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Peran Hj. Rosnani menjadi Admin Kabupaten.')).toBeInTheDocument()

    await user.click(within(await barisPengguna('Hj. Rosnani')).getByRole('button', { name: 'Aksi untuk Hj. Rosnani' }))
    await user.click(screen.getByRole('menuitem', { name: 'Nonaktifkan…' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Nonaktifkan' }))
    expect(await screen.findByText('Hj. Rosnani dinonaktifkan dan tidak bisa masuk lagi.')).toBeInTheDocument()
    expect(ambilDb().penggunaKabupaten.find((p) => p.id === 'kab_rosnani')).toMatchObject({ aktif: false, peran: 'admin' })
    expect(await screen.findByText('Nonaktif')).toBeInTheDocument()

    await user.click(within(await barisPengguna('Hj. Rosnani')).getByRole('button', { name: 'Aksi untuk Hj. Rosnani' }))
    await user.click(screen.getByRole('menuitem', { name: 'Aktifkan lagi' }))
    expect(await screen.findByText('Hj. Rosnani aktif kembali dan bisa masuk.')).toBeInTheDocument()
  })
  it('galat 409 dari server tampil sebagai toast', async () => {
    serverUji.use(
      http.patch('*/api/v1/kabupaten/pengguna/:id', () =>
        HttpResponse.json({ error: { code: 'CONFLICT', message: 'Kabupaten harus punya paling sedikit satu Admin aktif.' } }, { status: 409 }),
      ),
    )
    const user = pasang()
    await user.click(within(await barisPengguna('Hj. Rosnani')).getByRole('button', { name: 'Aksi untuk Hj. Rosnani' }))
    await user.click(screen.getByRole('menuitem', { name: 'Nonaktifkan…' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Nonaktifkan' }))
    expect(await screen.findByText('Kabupaten harus punya paling sedikit satu Admin aktif.')).toBeInTheDocument()
  })
  it('Peninjau melihat keadaan tanpa akses dengan tautan kembali ke Ringkasan', () => {
    pasang(AKUN_KABUPATEN_UJI.peninjau)
    expect(screen.getByRole('heading', { level: 1, name: 'Tidak punya akses' })).toBeInTheDocument()
    expect(screen.getByText('Peran Anda (Peninjau) tidak berhak membuka halaman ini.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Ringkasan' })).toHaveAttribute('href', '/kabupaten/admin')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })
})
