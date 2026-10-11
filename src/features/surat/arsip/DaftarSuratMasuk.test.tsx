import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DaftarSuratMasuk } from './DaftarSuratMasuk'
import { FILTER_SURAT_MASUK_BAWAAN } from './filter-url'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const TABEL = { name: 'Arsip surat masuk' }
const agenda = (n: number) => String(n).padStart(3, '0')

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'kades' ? AKUN_UJI.kades : AKUN_UJI.operator)
  renderPanel(
    <>
      <DaftarSuratMasuk filter={FILTER_SURAT_MASUK_BAWAAN} onUbahFilter={vi.fn()} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}
async function isi(user: UserEvent, dialog: HTMLElement, label: string, teks: string) {
  await user.click(within(dialog).getByRole('textbox', { name: label }))
  await user.paste(teks)
}

describe('arsip surat masuk (SPEC §7.4 layar 5)', () => {
  it('register bulan berjalan urut nomor agenda; baris membuka laci rincian', async () => {
    const user = pasang()
    const tabel = await screen.findByRole('grid', TABEL)
    const bulanIni = ambilDb()
      .suratMasuk.filter((s) => s.diterima.startsWith('2026-09'))
      .sort((a, b) => a.noAgenda - b.noAgenda)
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(bulanIni.length)
    expect(baris[0]).toHaveTextContent(agenda(bulanIni[0].noAgenda))
    const terakhir = bulanIni[bulanIni.length - 1]
    await user.click(baris[baris.length - 1])
    const laci = await screen.findByRole('dialog')
    expect(within(laci).getByRole('heading', { name: `Surat masuk No. ${agenda(terakhir.noAgenda)}` })).toBeInTheDocument()
    expect(within(laci).getByText(terakhir.perihal)).toBeInTheDocument()
  })
  it('Catat surat masuk: isian wajib ditandai; tersimpan dengan nomor agenda berikutnya', async () => {
    const user = pasang()
    await screen.findByRole('grid', TABEL)
    const berikut = Math.max(...ambilDb().suratMasuk.filter((s) => s.diterima.startsWith('2026')).map((s) => s.noAgenda)) + 1
    await user.click(screen.getByRole('button', { name: 'Catat surat masuk' }))
    const dialog = await screen.findByRole('dialog', { name: 'Catat surat masuk' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getByText('Nomor surat wajib diisi')).toBeInTheDocument()
    expect(within(dialog).getByText('Pengirim wajib diisi')).toBeInTheDocument()
    await isi(user, dialog, 'Nomor surat', '005/312/Kec-TM/IX/2026')
    await isi(user, dialog, 'Pengirim', 'Camat Teluk Meranti')
    await isi(user, dialog, 'Perihal', 'Undangan rapat koordinasi kepala desa')
    await user.click(within(dialog).getByRole('button', { name: /Disposisi kepada/ }))
    await user.click(await screen.findByRole('option', { name: 'Sekretaris Desa' }))
    await isi(user, dialog, 'Instruksi', 'Hadiri dan laporkan.')
    const masukan = dialog.querySelector<HTMLInputElement>('input[type="file"]')
    if (!masukan) throw new Error('input scan tidak ada')
    await user.upload(masukan, new File(['%PDF-1.4'], 'undangan.pdf', { type: 'application/pdf' }))
    expect(within(dialog).getByText('undangan.pdf · 1 KB')).toBeInTheDocument()
    // Berkas di FormData tidak bisa dikirim di lingkungan uji jsdom; pengiriman scan diuji di API (arsip.test.ts).
    await user.click(within(dialog).getByRole('button', { name: 'Hapus scan' }))
    expect(within(dialog).getByRole('button', { name: 'Pilih scan' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText(`Surat masuk dicatat dengan nomor agenda ${agenda(berikut)}.`)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Catat surat masuk' })).not.toBeInTheDocument())
    expect(ambilDb().suratMasuk.at(-1)).toMatchObject({
      noAgenda: berikut, scan: null, disposisi: { kepada: 'Sekretaris Desa', instruksi: 'Hadiri dan laporkan.' },
    })
  })
  it('scan selain PDF/gambar ditolak sebelum dikirim', async () => {
    const user = pasang()
    await screen.findByRole('grid', TABEL)
    await user.click(screen.getByRole('button', { name: 'Catat surat masuk' }))
    const dialog = await screen.findByRole('dialog', { name: 'Catat surat masuk' })
    const masukan = dialog.querySelector<HTMLInputElement>('input[type="file"]')
    if (!masukan) throw new Error('input scan tidak ada')
    await userEvent.setup({ applyAccept: false }).upload(masukan, new File(['x'], 'data.xlsx'))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Scan harus berkas PDF, JPG, atau PNG')
  })
  it('Kepala Desa: register bisa dilihat, tanpa Catat surat masuk (fokus review 5)', async () => {
    pasang('kades')
    await screen.findByRole('grid', TABEL)
    expect(screen.queryByRole('button', { name: 'Catat surat masuk' })).not.toBeInTheDocument()
  })
})
