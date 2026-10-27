import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailDesa } from './DetailDesa'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id: string) {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  renderKonsol(
    <>
      <DetailDesa id={id} tab="persiapan" sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
  )
  return userEvent.setup()
}

describe('Undang Sekretaris Desa dari Konsol (tahap 6C)', () => {
  it('Tanjung Lamo: undang lewat dialog; langkah Tambah pengguna selesai dan tawarannya hilang', async () => {
    const user = pasang('desa_tanjung_lamo')
    expect(await screen.findByText(/^Langkah Tambah pengguna hanya bisa dikerjakan Sekretaris Desa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undang Sekretaris Desa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Undang Sekretaris Desa' })
    await user.click(within(dialog).getByRole('button', { name: 'Kirim undangan' }))
    expect(within(dialog).getByText('Nama wajib diisi')).toBeInTheDocument()
    expect(within(dialog).getByText('Email belum benar.')).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Nama' })).toHaveFocus())
    await user.type(within(dialog).getByRole('textbox', { name: 'Nama' }), 'Rahmawati')
    await user.type(within(dialog).getByRole('textbox', { name: 'Email' }), 'sekdes@tanjunglamo.desa.id')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim undangan' }))
    expect(await screen.findByText(/^Undangan terkirim ke sekdes@tanjunglamo\.desa\.id \(tiruan\)/)).toBeInTheDocument()
    expect(await screen.findByText('1 dari 5 langkah selesai')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undang Sekretaris Desa' })).not.toBeInTheDocument()
    expect(ambilDb().pengguna.find((p) => p.email === 'sekdes@tanjunglamo.desa.id')?.peran).toBe('sekdes')
  })
  it('email terpakai ditandai di kolomnya; dialog tetap terbuka (fokus review 4)', async () => {
    const user = pasang('desa_tanjung_lamo')
    await user.click(await screen.findByRole('button', { name: 'Undang Sekretaris Desa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Undang Sekretaris Desa' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Nama' }), 'Rahmawati')
    await user.type(within(dialog).getByRole('textbox', { name: 'Email' }), 'rosmiati@sungaisialang.desa.id')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim undangan' }))
    expect(await within(dialog).findByText('Email ini sudah dipakai akun lain.')).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Email' })).toHaveFocus())
    expect(screen.getByRole('dialog', { name: 'Undang Sekretaris Desa' })).toBeInTheDocument()
  })
  it('desa yang sudah punya Sekretaris Desa tidak menawarkan undangan', async () => {
    pasang('desa_sungai_sialang')
    expect(await screen.findByText(/dari 5 langkah selesai$/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undang Sekretaris Desa' })).not.toBeInTheDocument()
  })
})
