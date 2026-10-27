import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailKabupaten } from './DetailKabupaten'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(kode = '14.05') {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  renderKonsol(
    <>
      <DetailKabupaten kode={kode} />
      <PenampungToast />
    </>,
  )
  return userEvent.setup()
}
function barisAkun(nama: string) {
  return waitFor(() => {
    const tabel = screen.getByRole('grid', { name: 'Akun kabupaten' })
    const baris = within(tabel).getAllByRole('row').find((r) => r.textContent?.includes(nama))
    if (!baris) throw new Error(`Baris ${nama} tidak ada`)
    return baris
  })
}

describe('Detail kabupaten mitra di Konsol (SPEC-V0.2 §7)', () => {
  it('identitas, portal, surat penunjukan, dan akun kabupaten', async () => {
    pasang()
    expect(await screen.findByRole('heading', { level: 1, name: 'Kabupaten Pelalawan' })).toBeInTheDocument()
    expect(screen.getByText('Mitra sejak 2 Maret 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'kab-pelalawan.sinfodes.localhost' })).toHaveAttribute('href', 'http://kab-pelalawan.sinfodes.localhost:3000/')
    expect(screen.getByText(/800\/DISKOMINFO\/II\/2026\/017/)).toBeInTheDocument()
    expect(screen.getByText(/surat-penunjukan-pelalawan\.pdf/)).toBeInTheDocument()
    const fajar = await barisAkun('Fajar Ramadhan')
    expect(fajar).toHaveTextContent('admin.pelalawan@demo.sinfodes.id')
    expect(fajar).toHaveTextContent('Admin Kabupaten')
    expect(await barisAkun('Hj. Rosnani')).toHaveTextContent('Peninjau')
  })
  it('menonaktifkan Admin aktif terakhir → toast galat; Peninjau bisa dinonaktifkan lalu diaktifkan lagi', async () => {
    const user = pasang()
    await user.click(within(await barisAkun('Fajar Ramadhan')).getByRole('button', { name: 'Nonaktifkan Fajar Ramadhan' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Nonaktifkan' }))
    expect(await screen.findByText('Kabupaten harus punya paling sedikit satu Admin aktif.')).toBeInTheDocument()
    expect(ambilDb().penggunaKabupaten.find((p) => p.id === 'kab_fajar')?.aktif).toBe(true)
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Batal' }))

    await user.click(within(await barisAkun('Hj. Rosnani')).getByRole('button', { name: 'Nonaktifkan Hj. Rosnani' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Nonaktifkan' }))
    expect(await screen.findByText('Hj. Rosnani dinonaktifkan dan tidak bisa masuk lagi.')).toBeInTheDocument()
    await user.click(within(await barisAkun('Hj. Rosnani')).getByRole('button', { name: 'Aktifkan Hj. Rosnani' }))
    expect(await screen.findByText('Hj. Rosnani aktif kembali dan bisa masuk.')).toBeInTheDocument()
  })
  it('kabupaten yang bukan mitra: keadaan tidak ditemukan', async () => {
    pasang('14.01')
    expect(await screen.findByRole('heading', { level: 1, name: 'Kabupaten tidak ditemukan' })).toBeInTheDocument()
  })
})
