import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh bisa melewati 3 detik bawaan saat seluruh suite berjalan paralel di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

const PESAN_UTAMA = 'Kontras warna utama di atas latar 1,3 : 1; perlu paling sedikit 4,5 : 1.'

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan')
  return userEvent.setup({ applyAccept: false })
}
const hexUtama = () => screen.findByRole('textbox', { name: 'Kode warna utama' })
const pratinjau = () => screen.getByRole('region', { name: 'Pratinjau tampilan website' })
const bilah = () => screen.getByRole('region', { name: 'Bilah draf' })
const ketik = async (user: ReturnType<typeof userEvent.setup>, kotak: HTMLElement, nilai: string) => {
  await user.clear(kotak)
  await user.type(kotak, nilai)
}

describe('Website Desa - Tampilan - Dasar di alur draf (rencana 7F-2 Tugas 2)', () => {
  it('sub-tab Dasar dan Susunan tampil; Kode belum ada', async () => {
    pasang()
    await hexUtama()
    const subtab = screen.getByRole('navigation', { name: 'Bagian tampilan' })
    expect(within(subtab).getAllByRole('link').map((a) => a.textContent)).toEqual(['Dasar', 'Susunan'])
  })
  it('warna kuning terang: pesan kontras persis tampil, status perlu diperbaiki, Terbitkan nonaktif', async () => {
    const user = pasang()
    await ketik(user, await hexUtama(), '#FFD400')
    expect(await screen.findByText(PESAN_UTAMA)).toBeInTheDocument()
    expect(within(bilah()).getByText('Ada isian yang perlu diperbaiki')).toBeInTheDocument()
    expect(within(bilah()).getByRole('button', { name: 'Terbitkan' })).toBeDisabled()
  })
  it('Pakai versi lebih gelap membuat pemeriksaan lolos dan simpan otomatis berjalan lagi', async () => {
    const user = pasang()
    await ketik(user, await hexUtama(), '#FFD400')
    await user.click(await screen.findByRole('button', { name: 'Pakai versi lebih gelap' }))
    await waitFor(() => expect(screen.queryByText(PESAN_UTAMA)).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Pakai versi lebih gelap' })).not.toBeInTheDocument()
    expect((screen.getByRole('textbox', { name: 'Kode warna utama' }) as HTMLInputElement).value).toMatch(/^#[0-9A-F]{6}$/)
    await waitFor(() => expect(within(bilah()).getByText(/^Draf tersimpan pukul/)).toBeInTheDocument())
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
  it('kepala Pita dan foto Penuh mengubah kedua pratinjau', async () => {
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
  })
  it('perubahan warna masuk draf otomatis; website publik belum berubah sampai diterbitkan', async () => {
    const user = pasang()
    await hexUtama()
    await user.click(within(screen.getByRole('radiogroup', { name: 'Preset warna utama' })).getByRole('radio', { name: 'Hijau sawit' }))
    await user.click(screen.getByRole('radio', { name: /^Bitter/ }))
    await waitFor(() => expect(within(bilah()).getByText(/^Draf tersimpan pukul/)).toBeInTheDocument())
    expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.draf?.tema).toMatchObject({ warnaUtama: '#2F5D3A', huruf: 'bitter' })
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#1F4E79')
  })
  it('kalimat sambutan 121 karakter ditandai dengan pesan persis; penghitung n/120', async () => {
    const user = pasang()
    await hexUtama()
    const kotak = screen.getByRole('textbox', { name: 'Kalimat sambutan' })
    expect(screen.getByText('0/120')).toBeInTheDocument()
    await user.click(kotak)
    await user.paste('x'.repeat(121))
    expect(screen.getByText('121/120')).toBeInTheDocument()
    expect(await screen.findByText('Kalimat sambutan paling banyak 120 karakter.')).toBeInTheDocument()
    expect(within(bilah()).getByText('Ada isian yang perlu diperbaiki')).toBeInTheDocument()
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
  it('tombol Simpan dan Batalkan perubahan sudah tidak ada: perubahan langsung mengalir ke draf', async () => {
    pasang()
    await hexUtama()
    expect(screen.queryByRole('button', { name: 'Simpan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Batalkan perubahan' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Kode warna utama' }), { target: { value: '#2F5D3A' } })
    await waitFor(() => expect(within(bilah()).getByText(/^Draf tersimpan pukul/)).toBeInTheDocument())
    expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.draf?.tema.warnaUtama).toBe('#2F5D3A')
  })
})
