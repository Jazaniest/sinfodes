import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Wilayah } from './Wilayah'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <>
      <Wilayah />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return userEvent.setup()
}

describe('Pengaturan › Wilayah (SPEC §8)', () => {
  it('pohon dusun → RW → RT berisi nama ketua; Simpan memperbarui Lembaga Desa (fokus review 5)', async () => {
    const user = pasang()
    const rt = await screen.findByRole('textbox', { name: 'Ketua RT 001' })
    expect(rt).toHaveValue('Jufri')
    expect(screen.getByRole('textbox', { name: 'Ketua RW 008' })).toBeInTheDocument()
    await user.clear(rt)
    await user.type(rt, 'Jufri Hasan')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Wilayah disimpan. Nama kepala dusun dan ketua RT/RW ikut diperbarui di Lembaga Desa.')).toBeInTheDocument()
    expect(ambilDb().pengurusLembaga.find((p) => p.jabatan === 'Ketua RT 001 / RW 001')?.nama).toBe('Jufri Hasan')
  })
  it('istilah wilayah yang diketik langsung dipakai judul dan label', async () => {
    const user = pasang()
    const istilah = await screen.findByRole('textbox', { name: 'Istilah untuk dusun' })
    await user.clear(istilah)
    await user.type(istilah, 'Jorong')
    expect(screen.getByRole('heading', { name: /Jorong I Kampung Tengah/ })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: 'Kepala jorong' })).toHaveLength(4)
  })
  it('nama kosong ditandai sebelum dikirim, data tidak berubah', async () => {
    const user = pasang()
    const kadus = (await screen.findAllByRole('textbox', { name: 'Kepala dusun' }))[1]
    await user.clear(kadus)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Nama kepala dusun wajib diisi')).toBeInTheDocument()
    expect(ambilDb().dusun.find((d) => d.id === 'dsn_ss_2')?.kepalaDusun).toBe('Sukardi')
  })
})
