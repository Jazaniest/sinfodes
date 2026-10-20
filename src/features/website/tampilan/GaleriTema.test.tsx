import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { simpanTema } from '@/api/website'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TabTampilan } from './TabTampilan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const KALIMAT_KONFIRMASI = 'Warna, huruf, sudut, kepadatan, kepala, foto, dan motif diganti. Logo, sampul, foto latar, dan sambutan tetap.'
const HILANG = 'Perubahan yang belum disimpan akan hilang.'

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <>
      <TabTampilan />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return userEvent.setup({ applyAccept: false })
}
const kartu = async (nama: string) => within(await screen.findByRole('figure', { name: `Tema ${nama}` }))
const terpasang = () => ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')!.terbit.tema

describe('Website Desa › Tampilan › Galeri tema (rencana 7E-2 Tugas 2)', () => {
  it('delapan kartu dengan gambar pratinjau; Warta bertanda Dipakai untuk Sungai Sialang', async () => {
    pasang()
    await screen.findByRole('textbox', { name: 'Kode warna utama' })
    const kartuTema = screen.getAllByRole('figure', { name: /^Tema / })
    expect(kartuTema).toHaveLength(8)
    expect(kartuTema.map((k) => k.getAttribute('aria-label'))).toEqual([
      'Tema Warta', 'Tema Balai', 'Tema Pesisir', 'Tema Serambi', 'Tema Ladang', 'Tema Tenun', 'Tema Rimba', 'Tema Bandar',
    ])
    const gambar = within(kartuTema[2]).getByAltText('Pratinjau tema Pesisir')
    expect(gambar).toHaveAttribute('loading', 'lazy')
    expect((await kartu('Warta')).getByText('Dipakai')).toBeInTheDocument()
    expect(screen.getAllByText('Dipakai')).toHaveLength(1)
  })
  it('Pakai tema ini pada Pesisir: dialog dengan teks persis, setuju → toast, tema tersimpan, logo tetap', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanTema({ ...TEMA_WARTA_BAWAAN('#1F4E79'), logo: PNG_KECIL, warga: { fotoLatar: null, sambutan: 'Selamat datang.' } })
    const user = pasang()
    await user.click((await kartu('Pesisir')).getByRole('button', { name: /^Pakai tema ini/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Pakai tema Pesisir?' })).toBeInTheDocument()
    expect(within(dialog).getByText(KALIMAT_KONFIRMASI)).toBeInTheDocument()
    expect(within(dialog).queryByText(HILANG)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Pakai tema' }))
    expect(await screen.findByText('Tema Pesisir dipasang.')).toBeInTheDocument()
    expect(terpasang()).toMatchObject({ idGaleri: 'pesisir', huruf: 'literata', kepala: 'pita', logo: PNG_KECIL, warga: { sambutan: 'Selamat datang.' } })
    const publik = await ambilIdentitasPublik('sungaisialang')
    expect(publik.tema).toMatchObject({ huruf: 'literata', kepala: 'pita', idGaleri: 'pesisir' })
    await waitFor(() => expect(within(screen.getByRole('figure', { name: 'Tema Pesisir' })).getByText('Dipakai')).toBeInTheDocument())
    expect(screen.getAllByText('Dipakai')).toHaveLength(1)
  })
  it('Batal menutup dialog tanpa menyimpan apa pun', async () => {
    const user = pasang()
    await user.click((await kartu('Tenun')).getByRole('button', { name: /^Pakai tema ini/ }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Batal' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(terpasang()).toMatchObject({ idGaleri: 'warta', huruf: 'plex' })
  })
  it('formulir kotor: dialog menyebut perubahan yang hilang; setelah setuju formulir memuat tema baru, bukan campuran', async () => {
    const user = pasang()
    await screen.findByRole('textbox', { name: 'Kode warna utama' })
    await user.click(screen.getByRole('radio', { name: /^Rapat/ }))
    await user.click(screen.getByRole('radio', { name: /^Bulat/ }))
    await user.click((await kartu('Pesisir')).getByRole('button', { name: /^Pakai tema ini/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(HILANG)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Pakai tema' }))
    expect(await screen.findByText('Tema Pesisir dipasang.')).toBeInTheDocument()
    // Pesisir: kepadatan lega, sudut bulat, huruf Literata, kepala pita, foto penuh.
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Lega/ })).toBeChecked())
    expect(screen.getByRole('radio', { name: /^Rapat/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /^Literata/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^Pita/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^Penuh/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Batalkan perubahan' })).toBeDisabled()
  })
  it('mengubah satu pengaturan lalu menyimpan menghapus tanda Dipakai; semua pengaturan tetap dapat diubah', async () => {
    const user = pasang()
    await user.click((await kartu('Tenun')).getByRole('button', { name: /^Pakai tema ini/ }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Pakai tema' }))
    await screen.findByText('Tema Tenun dipasang.')
    await waitFor(() => expect(within(screen.getByRole('figure', { name: 'Tema Tenun' })).getByText('Dipakai')).toBeInTheDocument())
    await user.click(screen.getByRole('radio', { name: /^Bulat/ }))
    // Belum disimpan: tanda masih menunjuk tema yang tersimpan.
    expect(screen.getAllByText('Dipakai')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(screen.queryByText('Dipakai')).not.toBeInTheDocument())
    expect(terpasang()).toMatchObject({ idGaleri: null, sudut: 'bulat', huruf: 'archivo' })
  })
  it('Lihat pratinjau membuka gambar besar; Pakai tema ini dari dialog lanjut ke konfirmasi', async () => {
    const user = pasang()
    await user.click((await kartu('Serambi')).getByRole('button', { name: /^Lihat pratinjau/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Tema Serambi' })
    expect(within(dialog).getByAltText('Pratinjau tema Serambi, ukuran besar')).toBeInTheDocument()
    expect(within(dialog).getByText(/^Huruf Fraunces/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Pakai tema ini' }))
    expect(await screen.findByRole('heading', { name: 'Pakai tema Serambi?' })).toBeInTheDocument()
  })
})
