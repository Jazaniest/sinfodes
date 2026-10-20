import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { ambilDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TabTampilan } from './TabTampilan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const PESAN_UTAMA = 'Kontras warna utama di atas latar 1,3 : 1; perlu paling sedikit 4,5 : 1.'

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <>
      <TabTampilan />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return userEvent.setup({ applyAccept: false })
}
const hexUtama = () => screen.findByRole('textbox', { name: 'Kode warna utama' })
const pratinjau = () => screen.getByRole('region', { name: 'Pratinjau tampilan website' })
const ketik = async (user: ReturnType<typeof userEvent.setup>, kotak: HTMLElement, nilai: string) => {
  await user.clear(kotak)
  await user.type(kotak, nilai)
}

describe('Website Desa › Tampilan › Dasar (rencana 7E-1 Tugas 4)', () => {
  it('hanya sub-tab Dasar yang tampil; Susunan dan Kode belum ada', async () => {
    pasang()
    await hexUtama()
    const subtab = screen.getByRole('navigation', { name: 'Bagian tampilan' })
    expect(within(subtab).getAllByRole('link').map((a) => a.textContent)).toEqual(['Dasar'])
  })
  it('warna kuning terang: pesan kontras persis tampil dan Simpan nonaktif', async () => {
    const user = pasang()
    await ketik(user, await hexUtama(), '#FFD400')
    expect(await screen.findByText(PESAN_UTAMA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()
    expect(screen.getByText('Perbaiki kontras dulu sebelum menyimpan.')).toBeInTheDocument()
  })
  it('Pakai versi lebih gelap membuat pemeriksaan lolos dan Simpan aktif', async () => {
    const user = pasang()
    await ketik(user, await hexUtama(), '#FFD400')
    await user.click(await screen.findByRole('button', { name: 'Pakai versi lebih gelap' }))
    await waitFor(() => expect(screen.queryByText(PESAN_UTAMA)).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Pakai versi lebih gelap' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled()
    expect((screen.getByRole('textbox', { name: 'Kode warna utama' }) as HTMLInputElement).value).toMatch(/^#[0-9A-F]{6}$/)
  })
  it('preset warna mengisi kode warna; kode yang rusak ditandai setelah isian dilepas', async () => {
    const user = pasang()
    const kotak = await hexUtama()
    await user.click(within(screen.getByRole('radiogroup', { name: 'Preset warna utama' })).getByRole('radio', { name: 'Hijau lumut' }))
    expect(kotak).toHaveValue('#4A6B2F')
    await ketik(user, kotak, '#12345')
    await user.tab()
    expect(await screen.findByText('Kode warna harus berbentuk #RRGGBB.')).toBeInTheDocument()
  })
  it('memilih huruf Fraunces, sudut bulat, kepadatan rapat, dan motif mega mendung mengubah kedua pratinjau', async () => {
    const user = pasang()
    await hexUtama()
    await user.click(screen.getByRole('radio', { name: /^Fraunces/ }))
    await user.click(screen.getByRole('radio', { name: 'Bulat' }))
    await user.click(screen.getByRole('radio', { name: /^Rapat/ }))
    await user.click(screen.getByRole('radio', { name: /^Mega mendung/ }))
    const bingkai = pratinjau().querySelectorAll<HTMLElement>('[data-situs]')
    expect(bingkai).toHaveLength(2)
    for (const b of bingkai) {
      expect(b.style.getPropertyValue('--desa-huruf-judul')).toContain('Fraunces')
      expect(b.style.getPropertyValue('--desa-sudut')).toBe('10px')
      expect(b.style.getPropertyValue('--desa-jarak')).toBe('1.5rem')
      expect(b.querySelector('svg[data-motif="mega-mendung"]')).not.toBeNull()
    }
    expect(within(pratinjau()).getByText('HP (390 px)')).toBeInTheDocument()
    expect(within(pratinjau()).getByText('Desktop (1280 px)')).toBeInTheDocument()
  })
  it('kepala Pita dan foto Penuh mengubah kedua pratinjau; Simpan membawa keduanya (7E-2)', async () => {
    const user = pasang()
    await hexUtama()
    await user.click(screen.getByRole('radio', { name: /^Pita/ }))
    await user.click(screen.getByRole('radio', { name: /^Penuh/ }))
    const bingkai = pratinjau().querySelectorAll<HTMLElement>('[data-situs]')
    expect(bingkai).toHaveLength(2)
    for (const b of bingkai) {
      expect(b.querySelector('header[data-bentuk="pita"] [data-pita]')).not.toBeNull()
      expect(b.querySelector('figure[data-foto="penuh"] [data-lapisan]')).not.toBeNull()
    }
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Tampilan website disimpan.')).toBeInTheDocument()
    expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.terbit.tema).toMatchObject({ kepala: 'pita', foto: 'penuh', idGaleri: null })
  })
  it('Simpan menyimpan tema: toast, dan website publik memuat tema baru', async () => {
    const user = pasang()
    await hexUtama()
    await user.click(within(screen.getByRole('radiogroup', { name: 'Preset warna utama' })).getByRole('radio', { name: 'Hijau sawit' }))
    await user.click(screen.getByRole('radio', { name: /^Bitter/ }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Tampilan website disimpan.')).toBeInTheDocument()
    expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.terbit.tema).toMatchObject({ warnaUtama: '#2F5D3A', huruf: 'bitter' })
    expect((await ambilIdentitasPublik('sungaisialang')).tema).toMatchObject({ warnaUtama: '#2F5D3A', huruf: 'bitter' })
  })
  it('kalimat sambutan 121 karakter ditolak dengan pesan persis; penghitung n/120', async () => {
    const user = pasang()
    await hexUtama()
    const kotak = screen.getByRole('textbox', { name: 'Kalimat sambutan' })
    expect(screen.getByText('0/120')).toBeInTheDocument()
    await user.click(kotak)
    await user.paste('x'.repeat(121))
    expect(screen.getByText('121/120')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Kalimat sambutan paling banyak 120 karakter.')).toBeInTheDocument()
    expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.terbit.tema.warga.sambutan).toBeNull()
  })
  it('galat 422 dari server tampil di isian warna utama', async () => {
    serverUji.use(
      http.put('*/api/v1/website/situs/tema', () =>
        HttpResponse.json({ error: { code: 'VALIDATION', message: 'Isian tidak valid.', fields: { warnaUtama: 'Pesan dari server.' } } }, { status: 422 }),
      ),
    )
    const user = pasang()
    await hexUtama()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Pesan dari server.')).toBeInTheDocument()
  })
  it('logo terlalu besar ditolak; foto latar halaman masuk dapat diunggah', async () => {
    const user = pasang()
    await hexUtama()
    const masukan = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    expect(masukan).toHaveLength(3)
    await user.upload(masukan[1], new File([new Uint8Array(600 * 1024)], 'logo.png', { type: 'image/png' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ukuran gambar paling besar 500 KB.')
    await user.upload(masukan[2], new File([new Uint8Array([137, 80, 78, 71])], 'latar.png', { type: 'image/png' }))
    expect(await screen.findByAltText('Foto latar halaman masuk yang dipilih')).toHaveAttribute('src', expect.stringMatching(/^data:image\/png;base64,/))
  })
  it('perubahan tanpa disimpan menandai formulir kotor; Batalkan perubahan mengembalikannya', async () => {
    const user = pasang()
    const kotak = await hexUtama()
    expect(screen.getByRole('button', { name: 'Batalkan perubahan' })).toBeDisabled()
    fireEvent.change(kotak, { target: { value: '#2F5D3A' } })
    expect(screen.getByRole('button', { name: 'Batalkan perubahan' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Batalkan perubahan' }))
    expect(kotak).toHaveValue('#1F4E79')
  })
})
