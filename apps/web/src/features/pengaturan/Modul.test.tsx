import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel, renderRute } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Modul } from './Modul'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const KETERANGAN =
  'Menu Kesehatan, jadwal posyandu di website, layanan warga, dan Beranda Kepala Dusun. Data tidak dihapus saat dimatikan.'
const modulSS = () => ambilDb().modulDesa.find((m) => m.desaId === 'desa_sungai_sialang')

function pasang() {
  masukSebagai(AKUN_UJI.sekdes)
  renderPanel(
    <>
      <Modul />
      <PenampungToast />
    </>,
    contohSesi('sekdes'),
  )
  return userEvent.setup()
}

describe('Pengaturan › Modul (SPEC-V0.2 12.3)', () => {
  it('satu baris Kesehatan (Posyandu) dengan keterangan; saklar menyala untuk Sungai Sialang', async () => {
    pasang()
    const saklar = await screen.findByRole('switch', { name: 'Kesehatan (Posyandu)' })
    expect(saklar).toBeChecked()
    expect(screen.getByText(KETERANGAN)).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(1)
  })
  it('mematikan: tersimpan, ada pesannya, dan datanya tidak dihapus; menyalakan lagi juga berpesan', async () => {
    const user = pasang()
    const jumlahPosyandu = ambilDb().posyandu.length
    await user.click(await screen.findByRole('switch', { name: 'Kesehatan (Posyandu)' }))
    expect(await screen.findByText('Modul Kesehatan dimatikan.')).toBeInTheDocument()
    expect(modulSS()?.kesehatan).toBe(false)
    expect(screen.getByRole('switch', { name: 'Kesehatan (Posyandu)' })).not.toBeChecked()
    expect(ambilDb().posyandu).toHaveLength(jumlahPosyandu)
    await user.click(screen.getByRole('switch', { name: 'Kesehatan (Posyandu)' }))
    expect(await screen.findByText('Modul Kesehatan dinyalakan.')).toBeInTheDocument()
    expect(modulSS()?.kesehatan).toBe(true)
  })
  it('gagal menyimpan: pesan galat dan saklar tetap seperti semula', async () => {
    const user = pasang()
    const saklar = await screen.findByRole('switch', { name: 'Kesehatan (Posyandu)' })
    aturModeJaringan('gagal')
    await user.click(saklar)
    expect(await screen.findByText('Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.')).toBeInTheDocument()
    await waitFor(() => expect(saklar).toBeChecked())
    expect(modulSS()?.kesehatan).toBe(true)
  })
})

describe('Pengaturan › Modul di panel (rute)', () => {
  it('tab Modul ada untuk Sekretaris Desa; mematikan menyembunyikan menu Kesehatan tanpa memuat ulang', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    renderRute('/admin/pengaturan/modul')
    const user = userEvent.setup()
    const tab = await screen.findByRole('navigation', { name: 'Bagian pengaturan' }, { timeout: 5000 })
    expect(within(tab).getByRole('link', { name: 'Modul' })).toHaveAttribute('aria-current', 'page')
    const menu = screen.getByRole('navigation', { name: /Menu utama/i })
    expect(within(menu).getByRole('link', { name: 'Kesehatan' })).toBeInTheDocument()
    await user.click(await screen.findByRole('switch', { name: 'Kesehatan (Posyandu)' }))
    await waitFor(() => expect(within(menu).queryByRole('link', { name: 'Kesehatan' })).not.toBeInTheDocument())
  })
  it('Operator tidak melihat tab Modul dan tidak bisa membuka halamannya', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderRute('/admin/pengaturan/modul')
    expect(await screen.findByRole('heading', { name: 'Tidak punya akses' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Kesehatan (Posyandu)' })).not.toBeInTheDocument()
  })
})
