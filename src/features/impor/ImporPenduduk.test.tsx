import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilRingkasanPenduduk } from '@/api/penduduk'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { unduhBerkas } from '@/ui/unduh'
import { ImporPenduduk } from './ImporPenduduk'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan({ dbSegarTiapUji: true })

async function sampaiPeriksa(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Coba dengan file contoh' }))
  await user.click(await screen.findByRole('button', { name: 'Lanjut ke pemeriksaan' }))
  return screen.findByText(/^\d+ siap · \d+ bermasalah/)
}

describe('Impor Excel (SPEC §6.8)', { timeout: 30_000 }, () => {
  it('empat langkah: contoh → cocokkan → lewati yang bermasalah → 12 penduduk dan 4 KK', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onKotor = vi.fn()
    const onLihatDaftar = vi.fn()
    renderPanel(<ImporPenduduk onKotor={onKotor} onLihatDaftar={onLihatDaftar} sekarang={SEKARANG_UJI} />, contohSesi())
    const user = userEvent.setup()
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Unggah berkas')
    expect(await sampaiPeriksa(user)).toHaveTextContent(
      '12 siap · 5 bermasalah (1 NIK tidak valid, 1 NIK ganda di berkas, 1 NIK sudah terdaftar, 1 tanggal tidak valid, 1 hubungan keluarga tidak valid)',
    )
    expect(onKotor).toHaveBeenLastCalledWith(true)
    expect(screen.getByText('Peringatan: Tanggal lahir berbeda dengan NIK (18 Jan 1982)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Impor 12 baris' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Lewati semua yang bermasalah' }))
    await user.click(screen.getByRole('button', { name: 'Impor 12 baris' }))
    expect(await screen.findByText('12 penduduk dan 4 KK ditambahkan; 5 baris dilewati.')).toBeInTheDocument()
    expect(onKotor).toHaveBeenLastCalledWith(false)
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2824)
    await user.click(screen.getByRole('button', { name: 'Unduh laporan' }))
    expect(unduhBerkas).toHaveBeenCalledWith(
      'laporan-impor-pendataan-rt-teluk-rengas.csv',
      expect.stringContaining('8;Dilewati;NIK sudah terdaftar di Sinfodes'),
    )
    await user.click(screen.getByRole('button', { name: 'Lihat daftar penduduk' }))
    expect(onLihatDaftar).toHaveBeenCalled()
  })
  it('perbaiki tanggal lahir yang mustahil → baris itu ikut diimpor', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<ImporPenduduk onLihatDaftar={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    const user = userEvent.setup()
    await sampaiPeriksa(user)
    await user.click(screen.getByRole('button', { name: 'Perbaiki baris 13' }))
    const dialog = await screen.findByRole('dialog', { name: 'Perbaiki baris 13' })
    const tanggal = within(dialog).getByRole('textbox', { name: 'Tanggal lahir' })
    await user.clear(tanggal)
    await user.click(tanggal)
    await user.paste('28/02/2009')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan perbaikan' }))
    expect(await screen.findByText(/^13 siap · 4 bermasalah/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lewati semua yang bermasalah' }))
    await user.click(screen.getByRole('button', { name: 'Impor 13 baris' }))
    expect(await screen.findByText('13 penduduk dan 4 KK ditambahkan; 4 baris dilewati.')).toBeInTheDocument()
  })
  it('lewati satu baris lalu batalkan', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<ImporPenduduk onLihatDaftar={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    const user = userEvent.setup()
    await sampaiPeriksa(user)
    await user.click(screen.getByRole('button', { name: 'Lewati baris 17' }))
    expect(await screen.findByText(/^12 siap · 4 bermasalah .* · 1 dilewati$/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Batal lewati baris 17' }))
    expect(await screen.findByText(/^12 siap · 5 bermasalah/)).toBeInTheDocument()
  })
})
