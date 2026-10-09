import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilLaporan, tolakLaporan } from '@/api/laporan'
import { ambilPenduduk } from '@/api/penduduk'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { CatatLahirDariLaporan } from '../mutasi/CatatLahirDariLaporan'
import { ProfilPenduduk } from '../penduduk/ProfilPenduduk'

pakaiApiTiruan({ dbSegarTiapUji: true })
// renderPanel tidak memasang penampung toast; uji profil memasangnya sendiri (ruling Tugas 10).
afterEach(() => kosongkanToast())

const JUDUL = 'Warga melaporkan: pekerjaan seharusnya Wiraswasta'

async function bannerLaporan(): Promise<HTMLElement> {
  const judul = await screen.findByText(JUDUL)
  const banner = judul.closest<HTMLElement>('[role="status"]')
  if (!banner) throw new Error('banner laporan tidak ada')
  return banner
}

describe('Laporan perbaikan di profil (SPEC §6.3)', { timeout: 20_000 }, () => {
  it('banner dengan nilai sekarang dan pelapor; Terapkan mengubah data dan menutup banner', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<><ProfilPenduduk id="pdk_syahrial" sekarang={SEKARANG_UJI} /><PenampungToast /></>, contohSesi())
    const banner = await bannerLaporan()
    expect(banner).toHaveTextContent('Tercatat sekarang: Nelayan/Perikanan · dilaporkan Siti Rahmah, Kemarin')
    expect(banner).toHaveTextContent('“Sudah dua tahun berjualan ikan asap di rumah, tidak melaut lagi.”')
    await userEvent.click(within(banner).getByRole('button', { name: 'Terapkan' }))
    expect(await screen.findByText('Pekerjaan Syahrial diperbarui dari laporan warga.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(JUDUL)).not.toBeInTheDocument())
    expect((await ambilPenduduk('pdk_syahrial')).pekerjaan).toBe('Wiraswasta')
  })
  it('Tolak dengan alasan', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    renderPanel(<><ProfilPenduduk id="pdk_syahrial" sekarang={SEKARANG_UJI} /><PenampungToast /></>, contohSesi('sekdes'))
    const user = userEvent.setup()
    await user.click(within(await bannerLaporan()).getByRole('button', { name: 'Tolak' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tolak laporan warga?' })
    await user.click(within(dialog).getByRole('textbox', { name: 'Alasan (tidak wajib)' }))
    await user.paste('Masih tercatat di kelompok nelayan.')
    await user.click(within(dialog).getByRole('button', { name: 'Tolak laporan' }))
    expect(await screen.findByText('Laporan warga ditolak.')).toBeInTheDocument()
    expect((await ambilLaporan('lap_pekerjaan_syahrial')).ditangani?.alasan).toBe('Masih tercatat di kelompok nelayan.')
  })
  it('Kepala Desa melihat laporan tanpa tombol', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<><ProfilPenduduk id="pdk_syahrial" sekarang={SEKARANG_UJI} /><PenampungToast /></>, contohSesi('kades'))
    expect(within(await bannerLaporan()).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Kelahiran dari laporan warga (SPEC §5.3)', { timeout: 20_000 }, () => {
  it('isian terisi dari laporan dan saran KK; simpan menyelesaikan laporan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onTersimpan = vi.fn()
    renderPanel(
      <CatatLahirDariLaporan laporanId="lap_kelahiran_rosnani" onTersimpan={onTersimpan} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />,
      contohSesi(),
    )
    expect(await screen.findByText('Dilaporkan Zulkifli lewat layanan warga, 08.00')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ibu' })).toHaveValue('Rosnani')
    expect(screen.getByRole('combobox', { name: 'Ayah' })).toHaveValue('Zulkifli')
    expect(screen.getByRole('textbox', { name: 'Nama bayi' })).toHaveValue('Nayla Safitri')
    expect(screen.getByRole('textbox', { name: 'Anak ke-' })).toHaveValue('3')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0]).toMatchObject({ nama: 'Nayla Safitri', keluargaId: 'kk_zulkifli' })
    expect((await ambilLaporan('lap_kelahiran_rosnani')).status).toBe('diterapkan')
  })
  it('laporan yang sudah ditangani tidak bisa dicatat lagi', async () => {
    masukSebagai(AKUN_UJI.operator)
    await tolakLaporan('lap_kelahiran_rosnani', null)
    renderPanel(
      <CatatLahirDariLaporan laporanId="lap_kelahiran_rosnani" onTersimpan={vi.fn()} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />,
      contohSesi(),
    )
    expect(await screen.findByText('Laporan kelahiran ini sudah ditangani')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Catat kelahiran' })).not.toBeInTheDocument()
  })
  it('laporan kelahiran bisa ditolak dari halamannya, mis. kelahirannya sudah tercatat lewat menu biasa', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(
      <CatatLahirDariLaporan laporanId="lap_kelahiran_rosnani" onTersimpan={vi.fn()} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />,
      contohSesi(),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Tolak laporan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tolak laporan warga?' })
    await user.click(within(dialog).getByRole('button', { name: 'Tolak laporan' }))
    expect(await screen.findByText('Laporan kelahiran ini sudah ditangani')).toBeInTheDocument()
    expect((await ambilLaporan('lap_kelahiran_rosnani')).status).toBe('ditolak')
  })
})
