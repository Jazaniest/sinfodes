import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Penomoran } from './Penomoran'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.sekdes)
  renderPanel(
    <>
      <Penomoran />
      <PenampungToast />
    </>,
    contohSesi('sekdes'),
  )
  return userEvent.setup()
}
const formatTersimpan = () => ambilDb().pengaturanSurat.find((p) => p.desaId === 'desa_sungai_sialang')?.formatNomor
const pratinjau = () => screen.getByRole('status', { name: 'Nomor berikutnya' }).textContent

describe('Pengaturan › Penomoran (SPEC §7.2)', () => {
  it('pratinjau nomor berikutnya dari format tersimpan; potongan yang digeser langsung mengubah pratinjau (fokus review 3)', async () => {
    const user = pasang()
    await screen.findByRole('status', { name: 'Nomor berikutnya' })
    expect(pratinjau()).toMatch(/^[\d.]+\/\d{3}\/SS\/IX\/2026$/)
    await user.click(screen.getByRole('button', { name: 'Geser Tahun ke kiri' }))
    expect(pratinjau()).toMatch(/\/SS\/2026\/IX$/)
  })
  it('format tanpa tahun ditolak sebelum disimpan; data tidak berubah (fokus review 3)', async () => {
    const user = pasang()
    await screen.findByRole('status', { name: 'Nomor berikutnya' })
    await user.click(screen.getByRole('button', { name: 'Hapus potongan Tahun' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(formatTersimpan() ?? '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}').toBe('{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}')
  })
  it('pemisah dan kode desa baru tampil di pratinjau, lalu tersimpan', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('radio', { name: /Strip/ }))
    const kode = screen.getByRole('textbox', { name: /Kode desa di nomor surat/ })
    await user.clear(kode)
    await user.type(kode, 'sls')
    expect(pratinjau()).toMatch(/^[\d.]+-\d{3}-SLS-IX-2026$/)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Penomoran surat disimpan.')).toBeInTheDocument()
    expect(formatTersimpan()).toBe('{klasifikasi}-{urut}-{kodeDesa}-{bulanRomawi}-{tahun}')
    expect(ambilDb().desa.find((d) => d.id === 'desa_sungai_sialang')?.kodeSurat).toBe('SLS')
  })
})
