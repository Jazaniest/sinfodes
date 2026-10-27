import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import type { TampilanWarga } from '@/domain/alamat/schema'
import { FormMasukWarga } from './FormMasukWarga'

pakaiApiTiruan({ dbSegarTiapUji: true })

function pasang() {
  const onBerhasil = vi.fn()
  render(<FormMasukWarga onBerhasil={onBerhasil} />)
  return { onBerhasil, user: userEvent.setup() }
}
const kolomNik = () => screen.getByRole('textbox', { name: 'NIK' })
const kolomPin = () => screen.getByLabelText('PIN')
const tombolMasuk = () => screen.getByRole('button', { name: 'Masuk' })

describe('masuk layanan warga (SPEC §10)', () => {
  it('nama desa dari alamat tampil di bawah judul (SPEC-V0.2 §4.3)', () => {
    render(<FormMasukWarga namaDesa="Sungai Sialang" onBerhasil={vi.fn()} />)
    expect(screen.getByText('Desa Sungai Sialang')).toBeInTheDocument()
  })
  it('desa Persiapan: layanan warga ditutup dengan pesan, tanpa kolom NIK (SPEC-V0.2 §4.1)', () => {
    render(<FormMasukWarga namaDesa="Tanjung Lamo" ditutup onBerhasil={vi.fn()} />)
    expect(screen.getByText('Layanan warga Desa Tanjung Lamo belum dibuka. Desa sedang menyiapkan datanya.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'NIK' })).not.toBeInTheDocument()
  })
  it('NIK dan PIN benar → onBerhasil dengan token dan sesi warga', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(kolomNik(), '1405095203918002')
    await user.type(kolomPin(), '246810')
    await user.click(tombolMasuk())
    await waitFor(() =>
      expect(onBerhasil).toHaveBeenCalledWith('warga.pdk_siti_rahmah', expect.objectContaining({ jenis: 'warga' })),
    )
  })
  it('isian kurang ditandai tanpa mengirim', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(kolomNik(), '14050952')
    await user.click(tombolMasuk())
    expect(screen.getByText('NIK terdiri dari 16 angka.')).toBeInTheDocument()
    expect(screen.getByText('PIN terdiri dari 6 angka.')).toBeInTheDocument()
    expect(onBerhasil).not.toHaveBeenCalled()
  })
  it('PIN salah: pesan di kolom PIN dan PIN dikosongkan; percobaan ke-5 → banner terkunci (fokus review 2)', async () => {
    const { onBerhasil, user } = pasang()
    await user.type(kolomNik(), '1405095203918002')
    for (let i = 1; i <= 5; i++) {
      await user.type(kolomPin(), '000000')
      await user.click(tombolMasuk())
      if (i < 5) await waitFor(() => expect(kolomPin()).toHaveValue(''))
    }
    expect(await screen.findByText('Terlalu banyak percobaan — coba lagi 15 menit.')).toBeInTheDocument()
    expect(onBerhasil).not.toHaveBeenCalled()
  })
  it('Lupa PIN: tanpa NIK diminta mengisi NIK; dengan NIK tampil konfirmasi', async () => {
    const { user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Lupa PIN?' }))
    expect(screen.getByText('Isi NIK lebih dulu, lalu ketuk Lupa PIN.')).toBeInTheDocument()
    await user.type(kolomNik(), '1405095203918002')
    await user.click(screen.getByRole('button', { name: 'Lupa PIN?' }))
    expect(await screen.findByText(/PIN baru dikirim ke nomor WhatsApp/)).toBeInTheDocument()
  })
})

describe('masuk warga dengan tema desa (rencana 7E-1 Tugas 5)', () => {
  const LATAR = '/demo/foto/sampul-sungai-kampar.jpg'
  const SAMBUTAN = 'Selamat datang di layanan warga Desa Sungai Sialang, silakan masuk dengan NIK dan PIN dari kantor desa.'
  const tampilan = (ubah: Partial<TampilanWarga> = {}): TampilanWarga => ({
    warnaUtama: '#2F5D3A', logo: null, fotoLatar: LATAR, sambutan: SAMBUTAN, huruf: 'plex', ...ubah,
  })
  const gambarLatar = (c: HTMLElement) => c.querySelector<HTMLElement>('img[alt=""]')

  it('sambutan, foto latar dekoratif, dan variabel warna desa; kolom NIK dan PIN sama seperti sebelumnya', () => {
    const { container } = render(<FormMasukWarga namaDesa="Sungai Sialang" tampilan={tampilan()} onBerhasil={vi.fn()} />)
    expect(screen.getByText(SAMBUTAN)).toBeInTheDocument()
    expect(gambarLatar(container)).toHaveAttribute('src', LATAR)
    expect(kolomNik()).toBeInTheDocument()
    expect(kolomPin()).toBeInTheDocument()
    const akar = container.querySelector<HTMLElement>('main')!
    expect(akar.style.getPropertyValue('--desa-warna-utama')).toBe('#2F5D3A')
    expect(akar.style.getPropertyValue('--color-biru')).toBe('var(--desa-warna-utama)')
    expect(akar.style.getPropertyValue('--radius-1')).toBe('')
  })
  it('tanpa foto latar tidak ada gambar latar; tanpa sambutan tidak ada kalimat sambutan', () => {
    const { container } = render(<FormMasukWarga namaDesa="Sungai Sialang" tampilan={tampilan({ fotoLatar: null, sambutan: null })} onBerhasil={vi.fn()} />)
    expect(gambarLatar(container)).toBeNull()
    expect(screen.queryByText(SAMBUTAN)).not.toBeInTheDocument()
  })
  it('foto latar terang dan sambutan 120 karakter: teks tetap di lembar putih dan boleh dipatahkan (fokus review 4)', () => {
    const { container } = render(<FormMasukWarga namaDesa="Sungai Sialang" tampilan={tampilan({ sambutan: 'x'.repeat(120) })} onBerhasil={vi.fn()} />)
    expect(screen.getByText('x'.repeat(120))).toHaveClass('break-words')
    const lembar = screen.getByRole('heading', { level: 1 }).closest('[data-lembar]')
    expect(lembar).toHaveClass('bg-lembar')
    expect(lembar).toContainElement(kolomNik())
    expect(lembar).not.toContainElement(gambarLatar(container))
  })
  it('logo desa tampil di kepala lembar; tanpa logo memakai tanda Sinfodes', () => {
    const logo = `data:image/png;base64,${'A'.repeat(64)}`
    const a = render(<FormMasukWarga namaDesa="Sungai Sialang" tampilan={tampilan({ logo })} onBerhasil={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Logo Desa Sungai Sialang' })).toHaveAttribute('src', logo)
    a.unmount()
    render(<FormMasukWarga namaDesa="Sungai Sialang" tampilan={tampilan()} onBerhasil={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Sinfodes' })).toBeInTheDocument()
  })
  it('huruf desa dipakai hanya untuk judul', () => {
    render(<FormMasukWarga namaDesa="Sungai Sialang" tampilan={tampilan({ huruf: 'fraunces' })} onBerhasil={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 }).style.fontFamily).toContain('Fraunces')
    expect(kolomNik().style.fontFamily).toBe('')
  })
})

