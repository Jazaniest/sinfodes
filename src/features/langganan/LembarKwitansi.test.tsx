import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { terbilangRupiah } from '@/domain/format/angka'
import type { Kwitansi } from '@/domain/langganan/tagihan'
import { LembarKwitansi } from './LembarKwitansi'

const kwitansi: Kwitansi = {
  nomor: 'KW/2026/0042',
  diterimaPada: '2026-09-24',
  nominal: 1_500_127,
  paket: 'Lengkap',
  periode: 'Triwulan IV 2026',
  nomorTagihan: 'SFD/2026/T4/001',
  desa: { nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan' },
}

describe('LembarKwitansi (rencana 7D-2 Tugas 3)', () => {
  it('memuat nomor, penerima, nominal beserta terbilangnya, keperluan, dan penanda Tim Sinfodes tanpa tanda tangan elektronik', () => {
    render(<LembarKwitansi kwitansi={kwitansi} />)
    const lembar = screen.getByRole('article', { name: 'Kwitansi KW/2026/0042' })
    expect(lembar).toHaveTextContent('Kwitansi')
    expect(lembar).toHaveTextContent('KW/2026/0042')
    expect(lembar).toHaveTextContent('24 September 2026')
    expect(lembar).toHaveTextContent('Telah diterima dari Pemerintah Desa Sungai Sialang, Kecamatan Teluk Meranti, Kabupaten Pelalawan')
    expect(lembar).toHaveTextContent('Rp1.500.127')
    expect(terbilangRupiah(1_500_127)).toBe('satu juta lima ratus ribu seratus dua puluh tujuh rupiah')
    expect(lembar).toHaveTextContent('Terbilang: satu juta lima ratus ribu seratus dua puluh tujuh rupiah')
    expect(lembar).toHaveTextContent('untuk pembayaran langganan Sinfodes paket Lengkap, Triwulan IV 2026, tagihan SFD/2026/T4/001')
    expect(screen.getByText('Tim Sinfodes')).toBeInTheDocument()
    expect(lembar).toHaveTextContent('Kwitansi dibuat otomatis oleh sistem. Dokumen demo.')
    expect(lembar).not.toHaveTextContent(/tanda tangan elektronik|TTE/i)
  })
})
