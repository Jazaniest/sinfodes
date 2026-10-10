import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { jalankanAksi } from '@/api/surat'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TumpukanTandaTangan } from './TumpukanTandaTangan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(peran: Peran = 'kades') {
  masukSebagai(peran === 'sekdes' ? AKUN_UJI.sekdes : AKUN_UJI.kades)
  renderPanel(
    <>
      <TumpukanTandaTangan sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}
/** Antrean Kades di data demo: Domisili (online) dan Pengantar SKCK (loket), terlama dulu. */
const antrean = () =>
  ambilDb()
    .permohonan.filter((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan')
    .sort((a, b) => a.masukPada.localeCompare(b.masukPada))
const namaPemohon = (id: string) => ambilDb().penduduk.find((p) => p.id === id)?.nama ?? '-'
const ringkasan = () => screen.getByRole('complementary', { name: 'Ringkasan surat' })

async function tandaTangani(user: ReturnType<typeof userEvent.setup>, tombol: 'Tanda tangani' | 'Tanda tangani & lanjut') {
  await user.click(screen.getByRole('button', { name: 'Tanda tangani' }))
  const dialog = await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })
  await user.click(within(dialog).getByLabelText('Passphrase tanda tangan elektronik'))
  await user.paste('sialang2026')
  await user.click(within(dialog).getByRole('button', { name: tombol }))
}

describe('tumpukan tanda tangan (SPEC §7.4 layar 4)', () => {
  it('satu per satu, terlama dulu; Lewati berputar kembali ke awal (fokus review 3)', async () => {
    const [pertama, kedua] = antrean()
    const user = pasang()
    expect(await screen.findByText('1 dari 2')).toBeInTheDocument()
    expect(within(ringkasan()).getByText(namaPemohon(pertama.pemohonId))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lewati' }))
    expect(screen.getByText('2 dari 2')).toBeInTheDocument()
    expect(within(ringkasan()).getByText(namaPemohon(kedua.pemohonId))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lewati' }))
    expect(screen.getByText('1 dari 2')).toBeInTheDocument()
  })
  it('"Tanda tangani & lanjut" langsung ke surat berikutnya; "Tanda tangani" menampilkan surat yang baru terbit', async () => {
    const user = pasang()
    await screen.findByText('1 dari 2')
    await tandaTangani(user, 'Tanda tangani & lanjut')
    expect(await screen.findByText(/^Surat ditandatangani\. Nomor /)).toBeInTheDocument()
    expect(await screen.findByText('1 dari 1')).toBeInTheDocument()
    await tandaTangani(user, 'Tanda tangani')
    expect(await screen.findByText('Ditandatangani secara elektronik')).toBeInTheDocument()
    expect(screen.getByText('Semua surat sudah ditandatangani.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Layanan Surat' })).toHaveAttribute('href', '/admin/surat')
  })
  it('Kembalikan dengan catatan: surat keluar dari tumpukan', async () => {
    const [pertama] = antrean()
    const user = pasang()
    await screen.findByText('1 dari 2')
    await user.click(screen.getByRole('button', { name: 'Kembalikan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Kembalikan ke operator?' })
    await user.click(within(dialog).getByRole('textbox', { name: 'Catatan perbaikan' }))
    await user.paste('Keperluan kurang jelas.')
    await user.click(within(dialog).getByRole('button', { name: 'Kembalikan' }))
    expect(await screen.findByText('1 dari 1')).toBeInTheDocument()
    expect(ambilDb().permohonan.find((p) => p.id === pertama.id)?.dikembalikan?.catatan).toBe('Keperluan kurang jelas.')
  })
  it('surat yang sudah ditandatangani orang lain → pesan dan tumpukan dimuat ulang (fokus review 3)', async () => {
    const [pertama] = antrean()
    const user = pasang()
    await screen.findByText('1 dari 2')
    await jalankanAksi(pertama.id, 'tandatangani', { passphrase: 'sialang2026' })
    await tandaTangani(user, 'Tanda tangani & lanjut')
    expect(await screen.findByText('Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('1 dari 1')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('tumpukan kosong → keterangan dan tautan kembali', async () => {
    masukSebagai(AKUN_UJI.kades)
    for (const p of antrean()) await jalankanAksi(p.id, 'tandatangani', { passphrase: 'sialang2026' })
    pasang()
    expect(await screen.findByText('Tidak ada surat yang menunggu tanda tangan Anda')).toBeInTheDocument()
  })
  it('Sekdes: dialog menyebut tanda tangan atas nama Kepala Desa', async () => {
    const user = pasang('sekdes')
    await screen.findByText('1 dari 2')
    await user.click(screen.getByRole('button', { name: 'Tanda tangani' }))
    expect(await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })).toHaveTextContent('Anda menandatangani atas nama Kepala Desa.')
  })
})
