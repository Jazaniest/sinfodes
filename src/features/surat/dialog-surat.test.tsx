import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DialogAlasan } from './DialogAlasan'
import { DialogKirimWa } from './DialogKirimWa'
import { DialogTandaTangani } from './DialogTandaTangani'

describe('DialogAlasan (SPEC §7.1: alasan atau catatan wajib)', () => {
  it('kosong ditolak di layar; isinya dikirim tanpa spasi tepi', async () => {
    const onSetuju = vi.fn()
    const user = userEvent.setup()
    render(
      <DialogAlasan judul="Tolak permohonan?" subjudul="Surat Keterangan Domisili · Siti Rahmah" label="Alasan penolakan"
        labelSetuju="Tolak permohonan" bahaya memuat={false} onSetuju={onSetuju} onTutup={vi.fn()} />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Tolak permohonan?' })
    await user.click(within(dialog).getByRole('button', { name: 'Tolak permohonan' }))
    expect(within(dialog).getByText('Alasan penolakan wajib diisi')).toBeInTheDocument()
    expect(onSetuju).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('textbox', { name: 'Alasan penolakan' }))
    await user.paste('  Foto KTP buram  ')
    expect(within(dialog).queryByText('Alasan penolakan wajib diisi')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Tolak permohonan' }))
    expect(onSetuju).toHaveBeenCalledWith('Foto KTP buram')
  })
  it('Batal menutup tanpa mengirim', async () => {
    const onTutup = vi.fn()
    const onSetuju = vi.fn()
    render(<DialogAlasan judul="Kembalikan ke operator?" label="Catatan perbaikan" labelSetuju="Kembalikan" memuat={false} onSetuju={onSetuju} onTutup={onTutup} />)
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onTutup).toHaveBeenCalled()
    expect(onSetuju).not.toHaveBeenCalled()
  })
})

describe('DialogTandaTangani (SPEC §7.4)', () => {
  const pasang = (ubah: { atasNama?: boolean; galat?: string } = {}) => {
    const onSetuju = vi.fn()
    const hasil = render(
      <DialogTandaTangani judulSurat="Surat Keterangan Domisili" pemohon="Siti Rahmah" atasNama={ubah.atasNama ?? false}
        memuat={false} galat={ubah.galat} onSetuju={onSetuju} onTutup={vi.fn()} />,
    )
    return { ...hasil, onSetuju, user: userEvent.setup() }
  }
  it('passphrase wajib; Enter mengirim', async () => {
    const { onSetuju, user } = pasang()
    const dialog = screen.getByRole('dialog', { name: 'Tanda tangani surat?' })
    expect(dialog).toHaveTextContent('Surat Keterangan Domisili · Siti Rahmah')
    expect(dialog).toHaveTextContent('Nomor surat diberikan saat ditandatangani dan tidak bisa diubah.')
    await user.click(within(dialog).getByRole('button', { name: 'Tanda tangani' }))
    expect(within(dialog).getByText('Passphrase wajib diisi')).toBeInTheDocument()
    await user.click(within(dialog).getByLabelText('Passphrase tanda tangan elektronik'))
    await user.paste('sialang2026')
    await user.keyboard('{Enter}')
    expect(onSetuju).toHaveBeenCalledWith('sialang2026')
  })
  it('galat dari server tampil di kolom passphrase (fokus review 3)', () => {
    pasang({ galat: 'Passphrase salah. Periksa kembali, lalu coba lagi.' })
    expect(screen.getByText('Passphrase salah. Periksa kembali, lalu coba lagi.')).toBeInTheDocument()
  })
  it('Sekretaris Desa diberi tahu bahwa ia menandatangani atas nama Kepala Desa', () => {
    pasang({ atasNama: true })
    expect(screen.getByRole('dialog')).toHaveTextContent('Anda menandatangani atas nama Kepala Desa.')
  })
})

describe('DialogKirimWa (SPEC §7.4)', () => {
  it('pratinjau pesan dan nomor tujuan tersamar; Kirim', async () => {
    const onKirim = vi.fn()
    render(<DialogKirimWa pesan={'Yth. Siti Rahmah,\nNomor: 470/087/SS/IX/2026'} tujuan="0812-••••-2231" memuat={false} onKirim={onKirim} onTutup={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Kirim ke WhatsApp?' })
    expect(dialog).toHaveTextContent('Ke 0812-••••-2231')
    expect(dialog).toHaveTextContent('Nomor: 470/087/SS/IX/2026')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kirim' }))
    expect(onKirim).toHaveBeenCalled()
  })
})
