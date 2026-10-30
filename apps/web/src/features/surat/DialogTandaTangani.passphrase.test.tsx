import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GalatApi } from '@/api/galat'
import { aturPassphrase, bacaStatusPassphrase } from '@/api/surat'
import { DialogTandaTangani } from './DialogTandaTangani'

// Diganti seluruhnya: uji ini memeriksa dialog, bukan server. Rute dan tiruannya punya uji sendiri.
vi.mock('@/api/surat', async (asli) => ({
  ...(await asli<typeof import('@/api/surat')>()),
  bacaStatusPassphrase: vi.fn(),
  aturPassphrase: vi.fn(),
}))
const baca = vi.mocked(bacaStatusPassphrase)
const atur = vi.mocked(aturPassphrase)

const pasang = (onSetuju = vi.fn()) => {
  const klien = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hasil = render(
    <QueryClientProvider client={klien}>
      <DialogTandaTangani judulSurat="Surat Keterangan Domisili" pemohon="Siti Rahmah" atasNama={false} memuat={false} onSetuju={onSetuju} onTutup={vi.fn()} />
    </QueryClientProvider>,
  )
  return { ...hasil, onSetuju, user: userEvent.setup() }
}
const isi = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, label: string, nilai: string) => {
  await user.click(within(dialog).getByLabelText(label))
  await user.paste(nilai)
}
const KATA_SANDI = 'Kata sandi akun'
const PASSPHRASE = 'Passphrase baru'
const ULANG = 'Ulangi passphrase'

beforeEach(() => {
  vi.stubEnv('VITE_DEMO', 'false')
  baca.mockReset()
  atur.mockReset()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DialogTandaTangani: menetapkan passphrase (rencana 8F2b Tugas 10)', () => {
  it('belum diatur: formulir Tetapkan passphrase tampil dan tombol Tanda tangani tersembunyi', async () => {
    baca.mockResolvedValue({ diatur: false })
    pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tetapkan passphrase tanda tangan' })
    expect(within(dialog).getByLabelText(KATA_SANDI)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(PASSPHRASE)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(ULANG)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Tanda tangani' })).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent('diminta setiap menandatangani')
    expect(dialog).toHaveTextContent('kata sandi akun')
  })

  it('isian tidak sah atau tidak cocok ditolak di layar sebelum dikirim', async () => {
    baca.mockResolvedValue({ diatur: false })
    const { user } = pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tetapkan passphrase tanda tangan' })
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    expect(within(dialog).getByText('Kata sandi wajib diisi')).toBeInTheDocument()
    expect(within(dialog).getByText('Passphrase minimal 8 karakter.')).toBeInTheDocument()
    await isi(user, dialog, KATA_SANDI, 'demo')
    await isi(user, dialog, PASSPHRASE, 'sialang2026')
    await isi(user, dialog, ULANG, 'sialang2027')
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    expect(within(dialog).getByText('Passphrase tidak sama.')).toBeInTheDocument()
    expect(atur).not.toHaveBeenCalled()
  })

  it('passphrase sama dengan kata sandi ditolak di layar dengan pesan skema', async () => {
    baca.mockResolvedValue({ diatur: false })
    const { user } = pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tetapkan passphrase tanda tangan' })
    await isi(user, dialog, KATA_SANDI, 'kata-sandi-akun')
    await isi(user, dialog, PASSPHRASE, 'kata-sandi-akun')
    await isi(user, dialog, ULANG, 'kata-sandi-akun')
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    expect(within(dialog).getByText('Passphrase tidak boleh sama dengan kata sandi akun.')).toBeInTheDocument()
    expect(atur).not.toHaveBeenCalled()
  })

  it('berhasil: dikirim apa adanya, lalu kembali ke tampilan Tanda tangani', async () => {
    baca.mockResolvedValue({ diatur: false })
    atur.mockResolvedValue({ diatur: true })
    const { user } = pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tetapkan passphrase tanda tangan' })
    await isi(user, dialog, KATA_SANDI, 'demo')
    await isi(user, dialog, PASSPHRASE, 'sialang2026')
    await isi(user, dialog, ULANG, 'sialang2026')
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    expect(atur).toHaveBeenCalledWith({ kataSandi: 'demo', passphrase: 'sialang2026' })
    const tanda = await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })
    expect(within(tanda).getByRole('button', { name: 'Tanda tangani' })).toBeInTheDocument()
  })

  it('galat 422 server tampil di isian yang benar: kata sandi salah di kolom kata sandi, passphrase di kolom passphrase', async () => {
    baca.mockResolvedValue({ diatur: false })
    const { user } = pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tetapkan passphrase tanda tangan' })
    await isi(user, dialog, KATA_SANDI, 'salah')
    await isi(user, dialog, PASSPHRASE, 'sialang2026')
    await isi(user, dialog, ULANG, 'sialang2026')
    atur.mockRejectedValueOnce(new GalatApi('VALIDATION', 'Kata sandi salah.', 422, { kataSandi: 'Kata sandi salah.' }))
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    expect(await within(dialog).findByText('Kata sandi salah.')).toBeInTheDocument()
    atur.mockRejectedValueOnce(new GalatApi('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, { passphrase: 'Passphrase minimal 8 karakter.' }))
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    await waitFor(() => expect(within(dialog).queryByText('Kata sandi salah.')).not.toBeInTheDocument())
    expect(await within(dialog).findAllByText('Passphrase minimal 8 karakter.')).not.toHaveLength(0)
  })

  it('429 tampil sebagai pesan di kolom kata sandi', async () => {
    baca.mockResolvedValue({ diatur: false })
    const { user } = pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tetapkan passphrase tanda tangan' })
    await isi(user, dialog, KATA_SANDI, 'demo')
    await isi(user, dialog, PASSPHRASE, 'sialang2026')
    await isi(user, dialog, ULANG, 'sialang2026')
    atur.mockRejectedValueOnce(new GalatApi('RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.', 429, {}))
    await user.click(within(dialog).getByRole('button', { name: 'Tetapkan passphrase' }))
    expect(await within(dialog).findByText('Terlalu banyak percobaan. Coba lagi beberapa saat lagi.')).toBeInTheDocument()
  })

  it('sudah diatur: tampilan Tanda tangani dengan tautan Ubah passphrase yang membuka formulir yang sama', async () => {
    baca.mockResolvedValue({ diatur: true })
    const { user, onSetuju } = pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })
    const tautan = await within(dialog).findByRole('button', { name: 'Ubah passphrase' })
    await isi(user, dialog, 'Passphrase tanda tangan elektronik', 'sialang2026')
    await user.click(within(dialog).getByRole('button', { name: 'Tanda tangani' }))
    expect(onSetuju).toHaveBeenCalledWith('sialang2026')
    await user.click(tautan)
    expect(await screen.findByRole('dialog', { name: 'Ubah passphrase tanda tangan' })).toBeInTheDocument()
  })

  it('mode demo: tidak ada permintaan status, formulir, atau tautan; keterangan passphrase demo tetap', async () => {
    vi.stubEnv('VITE_DEMO', 'true')
    pasang()
    const dialog = await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })
    expect(baca).not.toHaveBeenCalled()
    expect(within(dialog).queryByRole('button', { name: 'Ubah passphrase' })).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent('Simulasi TTE: passphrase demo tertulis di halaman demo.')
  })
})
