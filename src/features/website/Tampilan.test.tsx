import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Tampilan } from './Tampilan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <>
      <Tampilan />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return userEvent.setup({ applyAccept: false })
}
const pratinjau = () => screen.getByRole('region', { name: 'Pratinjau kepala halaman website' })

describe('Website Desa › Tampilan (SPEC §9)', () => {
  it('aksen dan motif yang dipilih langsung tampil di pratinjau; Simpan menyimpannya', async () => {
    const user = pasang()
    expect(await screen.findByRole('radio', { name: 'Biru tinta' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Hijau sawit' }))
    await user.click(screen.getByRole('radio', { name: 'Siku keluang' }))
    expect(pratinjau().querySelector('svg[data-motif="siku-keluang"] path')).toHaveAttribute('fill', '#2F5D3A')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Tampilan website disimpan.')).toBeInTheDocument()
    expect(ambilDb().tampilanWebsite[0]).toMatchObject({ aksen: 'hijau-sawit', motif: 'siku-keluang' })
  })
  it('foto sampul belum ada: bingkai kosong, bukan foto sementara', async () => {
    pasang()
    await screen.findByRole('radio', { name: 'Biru tinta' })
    expect(pratinjau()).toHaveTextContent('Belum ada foto sampul')
    expect(pratinjau().querySelector('img')).toBeNull()
  })
  it('logo: berkas terlalu besar ditolak; logo yang sah tampil di pratinjau (fokus review 4)', async () => {
    const user = pasang()
    await screen.findByRole('radio', { name: 'Biru tinta' })
    const [, masukanLogo] = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    await user.upload(masukanLogo, new File([new Uint8Array(600 * 1024)], 'logo.png', { type: 'image/png' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ukuran gambar paling besar 500 KB.')
    await user.upload(masukanLogo, new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' }))
    await waitFor(() => expect(pratinjau().querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/png;base64,/))
  })
})
