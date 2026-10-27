import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GalatApi } from '@/api/galat'
import { tambahKabupaten } from '@/api/konsol'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TambahKabupaten } from './TambahKabupaten'

// Berkas di FormData tidak bisa dikirim di lingkungan uji jsdom; pengirimannya diuji di API (konsol-kabupaten.test.ts, node).
vi.mock('@/api/konsol', async (asli) => ({ ...(await asli<typeof import('@/api/konsol')>()), tambahKabupaten: vi.fn() }))

pakaiApiTiruan()
afterEach(() => {
  kosongkanToast()
  vi.mocked(tambahKabupaten).mockReset()
})

function pasang() {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  const onSelesai = vi.fn()
  renderKonsol(
    <>
      <TambahKabupaten onSelesai={onSelesai} onBatal={() => {}} />
      <PenampungToast />
    </>,
  )
  return { onSelesai, user: userEvent.setup() }
}
// Nama tombol Select adalah "nilai label", jadi regexnya diakhiri label.
async function pilih(user: UserEvent, label: RegExp, opsi: string) {
  await user.click(screen.getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}
async function isiSemua(user: UserEvent, kabupaten: string) {
  await pilih(user, /Provinsi$/, 'Riau')
  await pilih(user, /Kabupaten$/, kabupaten)
  await user.type(screen.getByRole('textbox', { name: /^Nama Admin/ }), 'Rahmat Hidayat')
  await user.type(screen.getByRole('textbox', { name: /^Email Admin/ }), 'admin@kampar.go.id')
  await user.type(screen.getByRole('textbox', { name: /^Nomor surat/ }), '800/DISKOMINFO/X/2026/021')
  await user.click(within(screen.getByRole('group', { name: /Tanggal surat/ })).getAllByRole('spinbutton')[0])
  await user.keyboard('20092026')
  const masukan = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!masukan) throw new Error('input berkas tidak ada')
  await user.upload(masukan, new File([new Uint8Array(240 * 1024)], 'sk-bupati-kampar.pdf', { type: 'application/pdf' }))
}

describe('Tambah kabupaten mitra (SPEC-V0.2 §7)', { timeout: 30_000 }, () => {
  it('isian kosong ditandai di kolomnya, termasuk surat penunjukan, tanpa memanggil server', async () => {
    const { user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Simpan dan kirim undangan' }))
    expect(await screen.findByText('Pilih kabupaten.')).toBeInTheDocument()
    expect(screen.getByText('Unggah surat penunjukan (PDF).')).toBeInTheDocument()
    expect(tambahKabupaten).not.toHaveBeenCalled()
  })
  it('Kampar: berkas terpilih dan alamat portal tampil; isian dan PDF dikirim, lalu toast dan pindah ke detail', async () => {
    vi.mocked(tambahKabupaten).mockResolvedValue({ kode: '14.01', nama: 'Kampar', label: 'kab-kampar', emailAdmin: 'admin@kampar.go.id' })
    const { user, onSelesai } = pasang()
    await isiSemua(user, 'Kampar')
    expect(screen.getByText('sk-bupati-kampar.pdf · 240 KB')).toBeInTheDocument()
    expect(screen.getByText('kab-kampar.sinfodes.localhost')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan dan kirim undangan' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalledWith('14.01'))
    expect(tambahKabupaten).toHaveBeenCalledWith(
      {
        kabupaten: '14.01', namaAdmin: 'Rahmat Hidayat', emailAdmin: 'admin@kampar.go.id', nomorSurat: '800/DISKOMINFO/X/2026/021',
        tanggalSurat: '2026-09-20',
      },
      expect.objectContaining({ name: 'sk-bupati-kampar.pdf' }),
    )
    expect(await screen.findByText(/Kabupaten Kampar kini mitra\. Undangan terkirim ke admin@kampar\.go\.id/)).toBeInTheDocument()
  })
  it('galat server per kolom tampil di kolomnya', async () => {
    vi.mocked(tambahKabupaten).mockRejectedValue(
      new GalatApi('CONFLICT', 'Kabupaten Pelalawan sudah bermitra.', 409, { kabupaten: 'Kabupaten Pelalawan sudah bermitra.' }),
    )
    const { user, onSelesai } = pasang()
    await isiSemua(user, 'Pelalawan')
    await user.click(screen.getByRole('button', { name: 'Simpan dan kirim undangan' }))
    expect(await screen.findByText('Kabupaten Pelalawan sudah bermitra.')).toBeInTheDocument()
    expect(onSelesai).not.toHaveBeenCalled()
  })
})
