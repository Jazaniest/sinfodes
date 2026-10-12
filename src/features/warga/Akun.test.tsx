import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { kunciWarga } from '@/api/warga'
import { ambilDb } from '@/mocks/db'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderWarga } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Akun } from './Akun'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagaiWarga(AKUN_WARGA_UJI.siti)
  const onKeluar = vi.fn()
  const hasil = renderWarga(
    <>
      <Akun onKeluar={onKeluar} />
      <PenampungToast />
    </>,
  )
  return { ...hasil, onKeluar, user: userEvent.setup() }
}
const pinSiti = () => ambilDb().akunWarga.find((a) => a.pendudukId === 'pdk_siti_rahmah')?.pin

describe('Akun warga (SPEC §10)', () => {
  it('data akun: NIK disamarkan dan nomor WhatsApp terdaftar', () => {
    pasang()
    expect(screen.getByText('•••• •••• •••• 8002')).toBeInTheDocument()
    expect(screen.getByText('0812-7740-2231')).toBeInTheDocument()
    expect(screen.queryByText(/1405095203918002/)).not.toBeInTheDocument()
  })
  it('ganti PIN: PIN lemah dan ulangan berbeda ditandai sebelum dikirim; PIN lama salah ditandai dari server (fokus review 5)', async () => {
    const { user } = pasang()
    await user.type(screen.getByLabelText('PIN lama'), '246810')
    await user.type(screen.getByLabelText('PIN baru'), '123456')
    await user.type(screen.getByLabelText('Ulangi PIN baru'), '123457')
    await user.click(screen.getByRole('button', { name: 'Simpan PIN baru' }))
    expect(screen.getByText('PIN tidak boleh angka berurutan seperti 123456.')).toBeInTheDocument()
    expect(screen.getByText('Ulangan PIN baru tidak sama.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('PIN lama'))
    await user.type(screen.getByLabelText('PIN lama'), '000000')
    await user.clear(screen.getByLabelText('PIN baru'))
    await user.type(screen.getByLabelText('PIN baru'), '580317')
    await user.clear(screen.getByLabelText('Ulangi PIN baru'))
    await user.type(screen.getByLabelText('Ulangi PIN baru'), '580317')
    await user.click(screen.getByRole('button', { name: 'Simpan PIN baru' }))
    expect(await screen.findByText('PIN lama salah.')).toBeInTheDocument()
    expect(pinSiti()).toBe('246810')
  })
  it('ganti PIN berhasil → toast dan semua kotak PIN dikosongkan', async () => {
    const { user } = pasang()
    await user.type(screen.getByLabelText('PIN lama'), '246810')
    await user.type(screen.getByLabelText('PIN baru'), '580317')
    await user.type(screen.getByLabelText('Ulangi PIN baru'), '580317')
    await user.click(screen.getByRole('button', { name: 'Simpan PIN baru' }))
    expect(await screen.findByText('PIN diganti. Pakai PIN baru saat masuk berikutnya.')).toBeInTheDocument()
    expect(screen.getByLabelText('PIN lama')).toHaveValue('')
    expect(screen.getByLabelText('PIN baru')).toHaveValue('')
    expect(pinSiti()).toBe('580317')
  })
  it('ganti nomor WhatsApp: nomor tidak valid ditandai; nomor +62 disimpan dan sesi di cache diperbarui (fokus review 5)', async () => {
    const { user, queryClient } = pasang()
    const kolom = () => screen.getByRole('textbox', { name: 'Nomor WhatsApp baru' })
    await user.type(kolom(), '12345')
    await user.click(screen.getByRole('button', { name: 'Simpan nomor' }))
    expect(screen.getByText('Nomor WhatsApp diawali 08 dan terdiri dari 10–13 angka.')).toBeInTheDocument()
    await user.clear(kolom())
    await user.type(kolom(), '+62 813-1234-5678')
    await user.click(screen.getByRole('button', { name: 'Simpan nomor' }))
    expect(await screen.findByText('Nomor WhatsApp diganti menjadi 0813-1234-5678.')).toBeInTheDocument()
    expect(queryClient.getQueryData(kunciWarga.sesi)).toMatchObject({ whatsapp: '081312345678' })
  })
  it('Keluar memanggil onKeluar', async () => {
    const { user, onKeluar } = pasang()
    await user.click(screen.getByRole('button', { name: 'Keluar' }))
    expect(onKeluar).toHaveBeenCalledTimes(1)
  })
})
