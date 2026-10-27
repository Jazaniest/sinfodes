import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailDesa } from './DetailDesa'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

it('Ubah alamat desa: penjelasan alias, pemeriksaan alamat, lalu alamat baru tampil (SPEC-V0.2 §4.2)', async () => {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  renderKonsol(
    <>
      <DetailDesa id="desa_sungai_sialang" tab="ringkasan" sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
  )
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Ubah alamat' }))
  const dialog = await screen.findByRole('dialog', { name: 'Ubah alamat desa' })
  expect(dialog).toHaveTextContent(
    'Alamat lama sungaisialang tetap mengarah ke desa ini dan tidak bisa dipakai desa lain. QR pada surat lama tetap berlaku.',
  )
  await user.type(within(dialog).getByRole('textbox', { name: /^Alamat baru/ }), 'sialang')
  expect(await within(dialog).findByText('Alamat ini bisa dipakai.')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Simpan alamat baru' }))
  expect(await screen.findByText('Alamat desa diubah menjadi sialang.')).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: 'sialang.sinfodes.localhost' })).toBeInTheDocument()
})
