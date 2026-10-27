import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { simpanDraf, terbitkan } from '@/api/website'
import { susunBlok } from '@/domain/website/blok'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
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
const pratinjau = async () => screen.findByRole('region', { name: 'Pratinjau susunan' })

describe('Pratinjau susunan (rencana 7F-2 Tugas 4)', () => {
  it('klik blok di pratinjau memilih blok itu di panel pengaturan', async () => {
    const user = pasang()
    const wadah = await pratinjau()
    await waitFor(() => expect(wadah.querySelector('[data-bagian="blok-angka"]')).not.toBeNull())
    await user.click(wadah.querySelector('[data-bagian="blok-angka"]') as HTMLElement)
    const panel = screen.getByRole('region', { name: 'Pengaturan blok' })
    expect(within(panel).getByRole('heading', { name: 'Angka desa' })).toBeInTheDocument()
  })
  it('pilihan HP membuat lebar bingkai 390 px', async () => {
    const user = pasang()
    const wadah = await pratinjau()
    await user.click(within(wadah).getByRole('button', { name: 'HP' }))
    await waitFor(() => {
      const situs = wadah.querySelector<HTMLElement>('[data-situs]')
      expect(situs).not.toBeNull()
      expect(situs?.style.width).toBe('390px')
    })
    await user.click(within(wadah).getByRole('button', { name: 'Desktop' }))
    await waitFor(() => {
      expect(wadah.querySelector<HTMLElement>('[data-situs]')?.style.width).toBe('1280px')
    })
  })
  it('blok kosong digambar kotak bergaris putus dengan keterangannya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const susunan = susunanBawaan()
    susunan.beranda.push(susunBlok({ id: 'blk_video01', jenis: 'video', isi: { url: '', judul: '' } }))
    await simpanDraf(null, { tema: TEMA_WARTA_BAWAAN('#1F4E79'), susunan })
    await terbitkan('Video kosong.')
    pasang()
    const wadah = await pratinjau()
    expect(
      await within(wadah).findByText('Blok ini tidak tampil di website karena datanya belum ada.'),
    ).toBeInTheDocument()
  })
})
