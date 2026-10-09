import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { contohJenis } from '@/test/contoh-surat'
import { PilihJenisSurat } from './PilihJenisSurat'

const DAFTAR = [
  { ...contohJenis('SKU'), jumlahPakai: 120 },
  { ...contohJenis('SKD'), jumlahPakai: 165 },
  { ...contohJenis('SKBN'), jumlahPakai: 14 },
  { ...contohJenis('SKH'), jumlahPakai: 20, aktif: false },
]
const butir = () => within(screen.getByRole('list', { name: 'Jenis surat' })).getAllByRole('listitem')

describe('Buat surat langkah 1: jenis surat (SPEC §7.4)', () => {
  it('yang paling sering dipakai di atas, beserta syarat dan masa berlaku; jenis nonaktif tidak tampil', () => {
    render(<PilihJenisSurat daftar={DAFTAR} terpilih={null} onPilih={vi.fn()} />)
    const isi = butir().map((b) => b.textContent ?? '')
    expect(isi).toHaveLength(3)
    expect(isi[0]).toContain('Surat Keterangan Domisili')
    expect(isi[0]).toContain('Syarat: KTP, KK, Pengantar RT')
    expect(isi[0]).toContain('Berlaku 3 bulan')
    expect(isi[0]).toContain('Dipakai 165 kali dalam 12 bulan terakhir')
    expect(isi[1]).toContain('Surat Keterangan Usaha')
    expect(isi[2]).toContain('Berlaku tanpa batas waktu')
    expect(isi.join(' ')).not.toContain('Kehilangan')
  })
  it('cari menyaring nama atau kode; memilih mengirim kodenya', async () => {
    const onPilih = vi.fn()
    const user = userEvent.setup()
    render(<PilihJenisSurat daftar={DAFTAR} terpilih={null} onPilih={onPilih} />)
    await user.click(screen.getByRole('searchbox', { name: 'Cari jenis surat' }))
    await user.paste('usaha')
    expect(butir()).toHaveLength(1)
    await user.click(within(butir()[0]).getByRole('button'))
    expect(onPilih).toHaveBeenCalledWith('SKU')
  })
  it('tanpa hasil → Hapus pencarian', async () => {
    const user = userEvent.setup()
    render(<PilihJenisSurat daftar={DAFTAR} terpilih={null} onPilih={vi.fn()} />)
    await user.click(screen.getByRole('searchbox', { name: 'Cari jenis surat' }))
    await user.paste('akta tanah')
    expect(screen.getByText('Tidak ada jenis surat yang cocok dengan “akta tanah”')).toBeInTheDocument()
    // Tombol pertama milik kotak cari; yang kedua aksi keterangan kosong.
    const [, dariKeterangan] = screen.getAllByRole('button', { name: 'Hapus pencarian' })
    await user.click(dariKeterangan)
    expect(butir()).toHaveLength(3)
  })
})
