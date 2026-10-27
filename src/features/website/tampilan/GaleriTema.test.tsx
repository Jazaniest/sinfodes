import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { simpanDraf, terbitkan } from '@/api/website'
import { SUSUNAN_BERANDA_TEMA, susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh bisa melewati 3 detik bawaan saat seluruh suite berjalan paralel di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const KALIMAT_KONFIRMASI = 'Warna, huruf, sudut, kepadatan, kepala, foto, dan motif diganti. Logo, sampul, foto latar, dan sambutan tetap.'
const TOAST_DRAF = 'Tema Pesisir dipasang di draf. Terbitkan untuk menerapkannya.'

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan')
  return userEvent.setup({ applyAccept: false })
}
const kartu = async (nama: string) => within(await screen.findByRole('figure', { name: `Tema ${nama}` }))
const dokumen = () => ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')!

describe('Galeri tema ke alur draf (rencana 7F-2 Tugas 2, keputusan 9)', () => {
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
  it('dialog punya kotak centang susunan yang bawaannya mati; memasang tema masuk draf, publik belum berubah', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, {
      tema: { ...TEMA_WARTA_BAWAAN('#1F4E79'), logo: PNG_KECIL, warga: { fotoLatar: null, sambutan: 'Selamat datang.' } },
      susunan: susunanBawaan(),
    })
    await terbitkan('Awal.')
    const user = pasang()
    await user.click((await kartu('Pesisir')).getByRole('button', { name: /^Pakai tema ini/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Pakai tema Pesisir?' })).toBeInTheDocument()
    expect(within(dialog).getByText(KALIMAT_KONFIRMASI)).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: 'Juga pakai susunan beranda tema ini' })).not.toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Pakai tema' }))
    expect(await screen.findByText(TOAST_DRAF)).toBeInTheDocument()
    await waitFor(() => expect(dokumen().draf).not.toBeNull())
    const draf = dokumen().draf
    expect(draf?.tema).toMatchObject({ idGaleri: 'pesisir', huruf: 'literata', kepala: 'pita', logo: PNG_KECIL, warga: { sambutan: 'Selamat datang.' } })
    // Susunan beranda tetap milik desa karena kotak susunan tidak dicentang.
    expect(draf?.susunan.beranda.map((b) => b.id)).toEqual(susunanBawaan().beranda.map((b) => b.id))
    expect((await ambilIdentitasPublik('sungaisialang')).tema.idGaleri).toBe('warta')
  })
  it('centang "Juga pakai susunan beranda tema ini": susunan beranda diganti, halaman dan menu tetap', async () => {
    const user = pasang()
    await user.click((await kartu('Pesisir')).getByRole('button', { name: /^Pakai tema ini/ }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Juga pakai susunan beranda tema ini' }))
    await user.click(within(dialog).getByRole('button', { name: 'Pakai tema' }))
    expect(await screen.findByText(TOAST_DRAF)).toBeInTheDocument()
    await waitFor(() => expect(dokumen().draf).not.toBeNull())
    const draf = dokumen().draf
    expect(draf?.susunan.beranda.map((b) => b.id)).toEqual(SUSUNAN_BERANDA_TEMA.pesisir.map((b) => b.id))
    expect(draf?.susunan.menu).toEqual(susunanBawaan().menu)
  })
  it('Batal menutup dialog tanpa mengubah draf', async () => {
    const user = pasang()
    await user.click((await kartu('Tenun')).getByRole('button', { name: /^Pakai tema ini/ }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Batal' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(dokumen().draf).toBeNull()
  })
  it('tanda Dipakai mengikuti isian draf: mengubah satu pengaturan langsung menghapusnya', async () => {
    const user = pasang()
    await user.click((await kartu('Tenun')).getByRole('button', { name: /^Pakai tema ini/ }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Pakai tema' }))
    await screen.findByText('Tema Tenun dipasang di draf. Terbitkan untuk menerapkannya.')
    await waitFor(() => expect(within(screen.getByRole('figure', { name: 'Tema Tenun' })).getByText('Dipakai')).toBeInTheDocument())
    await user.click(screen.getByRole('radio', { name: /^Bulat/ }))
    await waitFor(() => expect(screen.queryByText('Dipakai')).not.toBeInTheDocument())
    await waitFor(() => expect(dokumen().draf?.tema).toMatchObject({ idGaleri: null, sudut: 'bulat', huruf: 'archivo' }))
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
