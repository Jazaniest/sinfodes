import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Identitas } from './Identitas'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'sekdes' ? AKUN_UJI.sekdes : AKUN_UJI.operator)
  renderPanel(
    <>
      <Identitas />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup({ applyAccept: false })
}
const desaDemo = () => ambilDb().desa.find((d) => d.id === 'desa_sungai_sialang')
const tab = () => within(screen.getByRole('navigation', { name: 'Bagian pengaturan' })).getAllByRole('link').map((a) => a.textContent)

describe('Pengaturan › Identitas (SPEC §8)', () => {
  it('isian tersimpan terisi; kepala desa dari akun Pengguna; tab Pengguna hanya untuk Sekdes (fokus review 1)', async () => {
    pasang('operator')
    expect(await screen.findByRole('textbox', { name: /Nama desa/ })).toHaveValue('Sungai Sialang')
    expect(screen.getByText('H. Muhammad Nasir')).toBeInTheDocument()
    expect(tab()).toEqual(['Identitas', 'Wilayah', 'Penomoran'])
  })
  it('Sekretaris Desa melihat tab Pengguna', async () => {
    pasang('sekdes')
    await screen.findByRole('textbox', { name: /Nama desa/ })
    expect(tab()).toEqual(['Identitas', 'Wilayah', 'Pengguna', 'Penomoran'])
  })
  it('pratinjau kop mengikuti alamat yang diketik; Simpan menyimpan dan memberi toast (fokus review 5)', async () => {
    const user = pasang()
    const alamat = await screen.findByRole('textbox', { name: /Alamat kantor/ })
    await user.clear(alamat)
    await user.type(alamat, 'Jalan Poros Desa No. 1')
    expect(within(screen.getByRole('region', { name: 'Pratinjau kop surat' })).getByText(/Jalan Poros Desa No\. 1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Identitas desa disimpan.')).toBeInTheDocument()
    expect(desaDemo()?.alamatKantor).toBe('Jalan Poros Desa No. 1')
  })
  it('isian salah ditandai sebelum dikirim, data tidak berubah', async () => {
    const user = pasang()
    const kodePos = await screen.findByRole('textbox', { name: /Kode pos/ })
    await user.clear(kodePos)
    await user.type(kodePos, '123')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Kode pos terdiri dari 5 angka')).toBeInTheDocument()
    expect(desaDemo()?.kodePos).toBe('28353')
  })
  it('lambang: berkas bukan gambar ditolak; gambar tampil di pratinjau kop (fokus review 4)', async () => {
    const user = pasang()
    await screen.findByRole('textbox', { name: /Nama desa/ })
    const masukan = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (!masukan) throw new Error('input berkas tidak ada')
    await user.upload(masukan, new File(['halo'], 'lambang.png', { type: 'text/plain' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Berkas harus gambar PNG, JPG, WebP, atau SVG.')
    await user.upload(masukan, new File([new Uint8Array([137, 80, 78, 71])], 'lambang.png', { type: 'image/png' }))
    const kop = screen.getByRole('region', { name: 'Pratinjau kop surat' })
    await waitFor(() => expect(kop.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/png;base64,/))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
