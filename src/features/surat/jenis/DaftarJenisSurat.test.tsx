import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DaftarJenisSurat } from './DaftarJenisSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'kades' ? AKUN_UJI.kades : AKUN_UJI.operator)
  renderPanel(
    <>
      <DaftarJenisSurat />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}

describe('Jenis Surat (SPEC §7.4 layar 6)', () => {
  it('12 jenis: saklar aktif dan online, ringkasan aturan dan pemakaian, tautan ubah', async () => {
    pasang()
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    expect(within(daftar).getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getByRole('switch', { name: 'Surat Keterangan Domisili aktif' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Surat Keterangan Kematian bisa diajukan online' })).not.toBeChecked()
    expect(screen.getByRole('link', { name: 'Ubah Surat Keterangan Domisili' })).toHaveAttribute('href', '/admin/surat/jenis/js_ss_skd')
    expect(screen.getByText(/^Kepala Desa; boleh a\.n\. Sekretaris Desa · berlaku 3 bulan · dipakai \d+ kali dalam 12 bulan$/)).toBeInTheDocument()
    // SKTM, SKP, dan SPN wajib diparaf Sekretaris Desa.
    expect(screen.getAllByText(/^Kepala Desa · diparaf Sekretaris Desa · berlaku 3 bulan · dipakai/)).toHaveLength(3)
    expect(within(screen.getByRole('navigation', { name: 'Bagian layanan surat' })).getByRole('link', { name: 'Jenis Surat' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
  it('menonaktifkan: saklar langsung berubah, tersimpan, dan ada pesannya', async () => {
    const user = pasang()
    const saklar = await screen.findByRole('switch', { name: 'Surat Keterangan Domisili aktif' })
    await user.click(saklar)
    expect(saklar).not.toBeChecked()
    expect(
      await screen.findByText('Surat Keterangan Domisili tidak dilayani lagi. Permohonan yang sudah ada tetap bisa diproses.'),
    ).toBeInTheDocument()
    expect(ambilDb().jenisSurat.find((j) => j.id === 'js_ss_skd')?.aktif).toBe(false)
  })
  it('gagal menyimpan: saklar kembali seperti semula dan ada pesan galat', async () => {
    const user = pasang()
    const saklar = await screen.findByRole('switch', { name: 'Surat Keterangan Domisili bisa diajukan online' })
    aturModeJaringan('gagal')
    await user.click(saklar)
    expect(await screen.findByText('Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.')).toBeInTheDocument()
    await waitFor(() => expect(saklar).toBeChecked())
    expect(ambilDb().jenisSurat.find((j) => j.id === 'js_ss_skd')?.online).toBe(true)
  })
  it('Kepala Desa: status sebagai teks, tanpa saklar dan tautan ubah (fokus review 5)', async () => {
    pasang('kades')
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    expect(within(daftar).queryAllByRole('switch')).toHaveLength(0)
    expect(within(daftar).getAllByText('Aktif')).toHaveLength(12)
    expect(screen.queryByRole('link', { name: /^Ubah / })).not.toBeInTheDocument()
  })
})
