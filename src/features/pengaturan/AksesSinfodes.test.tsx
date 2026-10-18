import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { AksesSinfodes } from './AksesSinfodes'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.sekdes)
  renderPanel(
    <>
      <AksesSinfodes />
      <PenampungToast />
    </>,
    contohSesi('sekdes'),
  )
  return userEvent.setup()
}

describe('Akses bantuan Sinfodes (SPEC-V0.2 §5.3)', () => {
  it('bawaan: 24 jam, data pribadi warga disamarkan', async () => {
    pasang()
    expect(await screen.findByRole('heading', { name: 'Akses bantuan Sinfodes' })).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: '24 jam' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Sembunyikan data pribadi warga (NIK dan nomor KK disamarkan)' })).toBeChecked()
  })
  it('beri akses lalu cabut: keadaan aktif tampil, lalu formulirnya kembali', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Beri akses' }))
    expect(await screen.findByText(/^Akses aktif sampai /)).toBeInTheDocument()
    expect(screen.getByText('Data pribadi warga disamarkan.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cabut akses' }))
    expect(await screen.findByRole('button', { name: 'Beri akses' })).toBeInTheDocument()
    expect(screen.queryByText(/^Akses aktif sampai /)).not.toBeInTheDocument()
  })
  it('Kepala Desa hanya melihat tab Akses Sinfodes di Pengaturan', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<AksesSinfodes />, contohSesi('kades'))
    expect(await screen.findByRole('button', { name: 'Beri akses' })).toBeInTheDocument()
    const tab = within(screen.getByRole('navigation', { name: 'Bagian pengaturan' })).getAllByRole('link')
    expect(tab.map((a) => a.textContent)).toEqual(['Akses Sinfodes'])
  })
  it('riwayat: siapa yang membuka dan ringkasan halamannya', async () => {
    pasang()
    const tabel = await screen.findByRole('table', { name: 'Riwayat akses' })
    const baris = within(tabel).getAllByRole('row')[1]
    expect(baris).toHaveTextContent('Dina')
    expect(baris).toHaveTextContent(/Kependudukan \(\d+\)/)
    expect(baris).toHaveTextContent('Habis waktunya')
  })
})
