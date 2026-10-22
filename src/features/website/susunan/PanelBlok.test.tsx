import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { simpanDraf, terbitkan } from '@/api/website'
import { susunBlok } from '@/domain/website/blok'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh bisa melewati 3 detik bawaan saat seluruh suite berjalan paralel di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan?bagian=susunan')
  return userEvent.setup({ applyAccept: false })
}
const daftarBlok = async () => {
  const grid = await screen.findByRole('grid', { name: 'Blok halaman' })
  await waitFor(() => expect(within(grid).getAllByRole('row').length).toBeGreaterThan(0))
  return grid
}
const panel = () => screen.getByRole('region', { name: 'Pengaturan blok' })

describe('Panel pengaturan blok (rencana 7F-2 Tugas 4)', () => {
  it('mengubah varian Kabar ke Kartu: pratinjau memuat bagian kabar varian kartu', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(await screen.findByRole('row', { name: 'Kabar terbaru (satu sorotan)' }))
    await user.click(within(panel()).getByRole('radio', { name: 'Kartu' }))
    await waitFor(() => {
      expect(document.querySelector('[data-bagian="blok-kabar"][data-varian="kartu"]')).not.toBeNull()
    })
  })
  it('URL video tidak sah: galat persis, status draf perlu diperbaiki, dan tidak ada PUT draf', async () => {
    masukSebagai(AKUN_UJI.operator)
    const susunan = susunanBawaan()
    susunan.beranda.push(susunBlok({ id: 'blk_video01', jenis: 'video', isi: { url: '', judul: '' } }))
    await simpanDraf(null, { tema: TEMA_WARTA_BAWAAN('#1F4E79'), susunan })
    await terbitkan('Video kosong.')
    const user = pasang()
    await daftarBlok()
    await user.click(await screen.findByRole('row', { name: 'Video (lebar)' }))
    const alamat = within(panel()).getByRole('textbox', { name: 'Alamat video YouTube' })
    await user.type(alamat, 'ht!tp://bukan-video')
    expect(await within(panel()).findByText('Alamat video YouTube tidak dikenali.')).toBeInTheDocument()
    expect(await screen.findByText('Ada isian yang perlu diperbaiki')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 1500))
    expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.draf).toBeNull()
  })
  it('varian, lebar, dan isian blok tampil di panel sesuai jenisnya', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(await screen.findByRole('row', { name: 'Potensi (kartu)' }))
    expect(within(panel()).getByRole('radio', { name: 'Daftar' })).toBeInTheDocument()
    expect(within(panel()).getByRole('radio', { name: 'Lebar' })).toBeInTheDocument()
    expect(within(panel()).getByRole('textbox', { name: 'Jumlah potensi' })).toBeInTheDocument()
    expect(within(panel()).getByText(/berdampingan di layar besar/)).toBeInTheDocument()
  })
})
