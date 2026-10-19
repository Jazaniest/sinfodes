import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TulisSiaran } from './TulisSiaran'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(akun: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(akun)
  const onTerkirim = vi.fn()
  renderKabupaten(
    <>
      <TulisSiaran onTerkirim={onTerkirim} onBatal={vi.fn()} />
      <PenampungToast />
    </>,
    contohSesiKabupaten(akun),
  )
  return { user: userEvent.setup(), onTerkirim }
}

describe('Tulis siaran (SPEC-V0.2 §8.4 Menulis siaran)', () => {
  it('kirim kosong: pesan judul dan isi, tanpa siaran baru', async () => {
    const { user } = pasang()
    await screen.findByRole('radiogroup', { name: 'Sasaran' })
    await user.click(screen.getByRole('button', { name: 'Kirim siaran' }))
    expect(await screen.findByText('Judul wajib diisi.')).toBeInTheDocument()
    expect(screen.getByText('Isi siaran wajib diisi.')).toBeInTheDocument()
    expect(ambilDb().siaran).toHaveLength(5)
  })
  it('sasaran kecamatan: tanpa centang meminta pilihan; satu kecamatan menghitung desanya', async () => {
    const { user } = pasang()
    await user.click(await screen.findByRole('radio', { name: 'Kecamatan tertentu' }))
    expect(screen.getByText('Pilih paling sedikit satu kecamatan.')).toBeInTheDocument()
    expect(screen.queryByText(/Siaran dikirim ke 0 desa/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Teluk Meranti (3 desa)' }))
    expect(screen.getByText('Siaran dikirim ke 3 desa.')).toBeInTheDocument()
  })
  it('sasaran desa: kotak centang per desa dikelompokkan per kecamatan', async () => {
    const { user } = pasang()
    await user.click(await screen.findByRole('radio', { name: 'Desa tertentu' }))
    const kelompok = screen.getByRole('group', { name: 'Teluk Meranti' })
    await user.click(within(kelompok).getByRole('checkbox', { name: 'Sungai Sialang' }))
    expect(screen.getByText('Siaran dikirim ke 1 desa.')).toBeInTheDocument()
  })
  it('perlu tindak lanjut tanpa tanggal ditolak', async () => {
    const { user } = pasang()
    await screen.findByRole('radiogroup', { name: 'Sasaran' })
    await user.type(screen.getByRole('textbox', { name: 'Judul' }), 'Rapat evaluasi')
    await user.type(screen.getByRole('textbox', { name: 'Isi' }), 'Mohon hadir.')
    await user.click(screen.getByRole('checkbox', { name: 'Perlu tindak lanjut' }))
    expect(screen.getByRole('group', { name: /Tenggat tindak lanjut/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kirim siaran' }))
    expect(await screen.findByText('Pilih tanggal tenggat.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
  it('alur lengkap: konfirmasi menyebut 25 desa, lalu toast dan pindah ke detail siaran baru', async () => {
    const { user, onTerkirim } = pasang()
    await screen.findByRole('radiogroup', { name: 'Sasaran' })
    await user.type(screen.getByRole('textbox', { name: 'Judul' }), 'Rapat evaluasi')
    await user.type(screen.getByRole('textbox', { name: 'Isi' }), 'Mohon hadir.{Enter}{Enter}Terima kasih.')
    expect(screen.getByText('Siaran dikirim ke 25 desa.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kirim siaran' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Kirim siaran ke 25 desa?' })
    expect(dialog).toHaveTextContent('Siaran tidak bisa diubah setelah terkirim, tetapi bisa ditarik.')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim' }))
    expect(await screen.findByText('Siaran terkirim ke 25 desa.')).toBeInTheDocument()
    await waitFor(() => expect(onTerkirim).toHaveBeenCalledWith(expect.stringMatching(/^srn_/)))
    const baru = ambilDb().siaran.find((s) => s.id === onTerkirim.mock.calls[0][0])
    expect(baru).toMatchObject({ judul: 'Rapat evaluasi', isi: 'Mohon hadir.\n\nTerima kasih.', tindakLanjut: null, lampiran: null })
  })
  it('Peninjau melihat pesan akses tanpa formulir', async () => {
    pasang(AKUN_KABUPATEN_UJI.peninjau)
    expect(screen.getByText('Hanya Admin Kabupaten yang mengirim siaran.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke daftar siaran' })).toHaveAttribute('href', '/kabupaten/admin/siaran')
    expect(screen.queryByRole('button', { name: 'Kirim siaran' })).not.toBeInTheDocument()
  })
})
