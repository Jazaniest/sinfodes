import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DaftarLencana } from './DaftarLencana'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const tampilkan = () =>
  renderPanel(
    <>
      <DaftarLencana />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )

describe('Website Desa › Lencana (rencana 7C-2 Tugas 5)', () => {
  it('daftar per periode, tab Lencana aktif, dan keterangan; mematikan saklar memanggil API dan menampilkan toast', async () => {
    masukSebagai(AKUN_UJI.operator)
    tampilkan()
    const saklar = await screen.findAllByRole('switch', { name: /^Tampil di website: / })
    expect(saklar.length).toBe(ambilDb().lencana.filter((l) => l.desaId === 'desa_sungai_sialang').length)
    expect(screen.getByRole('link', { name: 'Lencana' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText(/^Lencana terbit otomatis saat desa masuk podium\./)).toBeInTheDocument()
    expect(saklar[0]).toBeChecked()
    await userEvent.setup().click(saklar[0])
    expect(await screen.findByText('Lencana disembunyikan dari website.')).toBeInTheDocument()
    await waitFor(() => expect(ambilDb().lencana.filter((l) => l.desaId === 'desa_sungai_sialang' && !l.tampil)).toHaveLength(1))
  })
  it('tanpa lencana: keterangan kosong', async () => {
    masukSebagai(AKUN_UJI.operator)
    ubahDb((d) => {
      d.lencana = []
    })
    tampilkan()
    expect(await screen.findByText('Belum ada lencana. Lencana terbit saat desa masuk podium kecamatan atau kabupaten.')).toBeInTheDocument()
  })
})
