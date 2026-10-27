import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { contohJenis } from '@/test/contoh-surat'
import { IsianSurat } from './IsianSurat'

describe('IsianSurat (SPEC §7.3, §7.4)', () => {
  it('saat bisa diubah: isian diketik; isian tidak wajib diberi tanda; galat tampil di isiannya', async () => {
    const onUbah = vi.fn()
    const user = userEvent.setup()
    render(
      <IsianSurat
        jenis={contohJenis('SKTM')}
        nilai={{ keperluan: 'Pendidikan' }}
        galat={{ instansiTujuan: 'Instansi tujuan wajib diisi' }}
        bisaUbah
        onUbah={onUbah}
      />,
    )
    expect(screen.getByText('Instansi tujuan wajib diisi')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Anggota keluarga yang dibantu (tidak wajib)' })).toBeInTheDocument()
    await user.click(screen.getByRole('textbox', { name: 'Instansi tujuan' }))
    await user.paste('SMA Negeri 1 Teluk Meranti')
    expect(onUbah).toHaveBeenLastCalledWith('instansiTujuan', 'SMA Negeri 1 Teluk Meranti')
  })
  it('isian angka memakai papan angka', () => {
    render(<IsianSurat jenis={contohJenis('SKU')} nilai={{}} galat={{}} bisaUbah onUbah={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Mulai usaha (tahun)' })).toHaveAttribute('inputmode', 'numeric')
  })
  it('di luar status Diproses: daftar label-nilai; rupiah diformat, yang kosong "Belum diisi"', () => {
    render(<IsianSurat jenis={contohJenis('SKP')} nilai={{ penghasilan: '1250000' }} galat={{}} bisaUbah={false} onUbah={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Rp1.250.000')).toBeInTheDocument()
    expect(screen.getByText('Belum diisi')).toBeInTheDocument()
  })
})
