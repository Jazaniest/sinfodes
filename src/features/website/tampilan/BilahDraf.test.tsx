import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { simpanDraf, terbitkan } from '@/api/website'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ID_SUNGAI_SIALANG } from '@/mocks/data/desa-demo'
import { ambilDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh bisa melewati 3 detik bawaan saat seluruh suite berjalan paralel di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan')
  return userEvent.setup({ applyAccept: false })
}
const bilah = () => screen.findByRole('region', { name: 'Bilah draf' })
const hexUtama = () => screen.findByRole('textbox', { name: 'Kode warna utama' })
const dokumen = () => ambilDb().situs.find((s) => s.desaId === ID_SUNGAI_SIALANG)!

describe('Bilah draf, terbitkan, buang, dan riwayat (rencana 7F-2 Tugas 2)', () => {
  it('status: Tidak ada draf, Menyimpan…, lalu Draf tersimpan pukul 09.00', async () => {
    pasang()
    const b = await bilah()
    expect(await within(b).findByText('Tidak ada draf')).toBeInTheDocument()
    fireEvent.change(await hexUtama(), { target: { value: '#2F5D3A' } })
    expect(within(b).getByText('Menyimpan…')).toBeInTheDocument()
    expect(await within(b).findByText('Draf tersimpan pukul 09.00')).toBeInTheDocument()
  })
  it('Terbitkan nonaktif tanpa draf; dialog memuat nama desa dan catatan; setuju menerbitkan', async () => {
    const user = pasang()
    const b = await bilah()
    expect(await within(b).findByRole('button', { name: 'Terbitkan' })).toBeDisabled()
    fireEvent.change(await hexUtama(), { target: { value: '#2F5D3A' } })
    await within(b).findByText('Draf tersimpan pukul 09.00')
    await user.click(within(b).getByRole('button', { name: 'Terbitkan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Terbitkan website?' })
    expect(within(dialog).getByText('Website Desa Sungai Sialang akan berubah sesuai draf.')).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: 'Catatan terbitan' }), 'Ganti warna menjadi hijau.')
    await user.click(within(dialog).getByRole('button', { name: 'Terbitkan' }))
    expect(await screen.findByText('Website diterbitkan.')).toBeInTheDocument()
    expect(await within(b).findByText('Tidak ada draf')).toBeInTheDocument()
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#2F5D3A')
    expect(dokumen().terbit.catatan).toBe('Ganti warna menjadi hijau.')
  })
  it('Buang draf meminta konfirmasi dengan kalimat persis dan kembali ke versi terbit', async () => {
    const user = pasang()
    const b = await bilah()
    fireEvent.change(await hexUtama(), { target: { value: '#2F5D3A' } })
    await within(b).findByText('Draf tersimpan pukul 09.00')
    await user.click(within(b).getByRole('button', { name: 'Buang draf' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Buang draf?' })).toBeInTheDocument()
    expect(within(dialog).getByText('Semua perubahan yang belum diterbitkan hilang.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Buang draf' }))
    await waitFor(() => expect(within(b).getByText('Tidak ada draf')).toBeInTheDocument())
    expect(dokumen().draf).toBeNull()
    expect((screen.getByRole('textbox', { name: 'Kode warna utama' }) as HTMLInputElement).value).toBe('#1F4E79')
  })
  it('draf diubah di tempat lain: banner dengan tombol Muat ulang; setelah dimuat ulang penyuntingan berlanjut', async () => {
    const user = pasang()
    const b = await bilah()
    fireEvent.change(await hexUtama(), { target: { value: '#2F5D3A' } })
    await within(b).findByText('Draf tersimpan pukul 09.00')
    await simpanDraf(dokumen().draf!.id, {
      tema: { ...TEMA_WARTA_BAWAAN('#1F4E79'), warnaUtama: '#9A3B2A', warnaAksen: '#9A3B2A' },
      susunan: susunanBawaan(),
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Kode warna utama' }), { target: { value: '#14607A' } })
    expect(await within(b).findByText('Draf diubah di tempat lain. Muat ulang untuk melihat perubahan terbaru.')).toBeInTheDocument()
    await user.click(within(b).getByRole('button', { name: 'Muat ulang' }))
    await waitFor(() => expect(within(b).queryByText(/Draf diubah di tempat lain/)).not.toBeInTheDocument())
    expect((screen.getByRole('textbox', { name: 'Kode warna utama' }) as HTMLInputElement).value).toBe('#9A3B2A')
  })
  it('gagal menyimpan menampilkan tombol Coba lagi yang mengulang simpanan', async () => {
    let percobaan = 0
    serverUji.use(
      http.put('*/api/v1/website/situs/draf', () => {
        percobaan++
        return HttpResponse.json({ error: { code: 'SERVER', message: 'Server sedang tidak dapat dihubungi.' } }, { status: 500 })
      }),
    )
    const user = pasang()
    const b = await bilah()
    fireEvent.change(await hexUtama(), { target: { value: '#2F5D3A' } })
    await within(b).findByText('Gagal menyimpan. Coba lagi')
    expect(percobaan).toBe(1)
    await user.click(within(b).getByRole('button', { name: 'Coba lagi' }))
    await waitFor(() => expect(percobaan).toBe(2))
  })
  it('Riwayat: laci berisi versi tayang dan versi lama; Pulihkan menyalin versi lama menjadi draf', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, { tema: { ...TEMA_WARTA_BAWAAN('#1F4E79'), warnaUtama: '#2F5D3A', warnaAksen: '#2F5D3A' }, susunan: susunanBawaan() })
    await terbitkan('Hijau.')
    const user = pasang()
    const b = await bilah()
    fireEvent.change(await hexUtama(), { target: { value: '#9A3B2A' } })
    await within(b).findByText('Draf tersimpan pukul 09.00')
    await user.click(within(b).getByRole('button', { name: 'Riwayat' }))
    const laci = await screen.findByRole('dialog', { name: 'Riwayat terbitan' })
    expect(within(laci).getByText('Sedang tayang')).toBeInTheDocument()
    expect(within(laci).getByText('Hijau.')).toBeInTheDocument()
    const pulihkan = within(laci).getAllByRole('button', { name: /^Pulihkan/ })
    expect(pulihkan).toHaveLength(1)
    await user.click(pulihkan[0])
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Versi ini disalin menjadi draf. Website belum berubah sampai diterbitkan.')).toBeInTheDocument()
    expect(within(dialog).getByText('Draf yang ada sekarang akan diganti.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Pulihkan' }))
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Kode warna utama' }) as HTMLInputElement).value).toBe('#1F4E79'))
    expect(dokumen().draf?.tema.warnaUtama).toBe('#1F4E79')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#2F5D3A')
    expect(dokumen().terbit.catatan).toBe('Hijau.')
  })
  it('pulihkan versi dengan tema gagal kontras: draf terisi, kontras gagal, dan Terbitkan nonaktif (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    dokumen().riwayat.unshift({
      id: 'vrs_901',
      tema: { ...TEMA_WARTA_BAWAAN('#FFD400'), warnaUtama: '#FFD400', warnaAksen: '#FFD400' },
      susunan: susunanBawaan(),
      diperbarui: '2026-09-20T09:00:00+07:00',
      oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' },
      catatan: 'Uji kontras.',
    })
    const user = pasang()
    const b = await bilah()
    await user.click(within(b).getByRole('button', { name: 'Riwayat' }))
    const laci = await screen.findByRole('dialog', { name: 'Riwayat terbitan' })
    await user.click(within(laci).getAllByRole('button', { name: /^Pulihkan/ })[0])
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Pulihkan' }))
    await waitFor(() => expect(within(b).getByText('Ada isian yang perlu diperbaiki')).toBeInTheDocument())
    expect(within(b).getByRole('button', { name: 'Terbitkan' })).toBeDisabled()
    expect(await screen.findByText('Kontras warna utama di atas latar 1,3 : 1; perlu paling sedikit 4,5 : 1.')).toBeInTheDocument()
    expect(dokumen().draf?.tema.warnaUtama).toBe('#FFD400')
  })
})
