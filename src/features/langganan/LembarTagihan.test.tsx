import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { REKENING_SINFODES } from '@/app/kontak-sinfodes'
import type { TagihanCetak } from '@/domain/langganan/schema'
import { buatTagihan } from '@/mocks/tagihan-hitung'
import { LembarTagihan } from './LembarTagihan'

function contoh(ubah: Partial<TagihanCetak> = {}): TagihanCetak {
  const desa = [{ id: 'desa_sungai_sialang', status: 'Aktif' }] as Parameters<typeof buatTagihan>[0]['desa']
  const t = buatTagihan(
    { desa, tagihan: [] },
    { desa: desa[0], langganan: { paket: 'Lengkap', periodeTagihan: 'triwulan' }, periode: { mulai: '2026-10-01', sampai: '2026-12-31', label: 'Triwulan IV 2026' } },
  )
  return {
    ...t,
    kodeUnik: 127,
    nominal: 3_000_127,
    desa: { nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', alamatKantor: 'Jl. Lintas Timur Km 12' },
    rekening: { ...REKENING_SINFODES },
    ...ubah,
  }
}

describe('LembarTagihan (SPEC-V0.2 §10)', () => {
  it('memuat nomor, desa, periode, nominal beserta rincian, rekening, cara konfirmasi, dan keterangan demo', () => {
    render(<LembarTagihan tagihan={contoh()} />)
    const lembar = screen.getByRole('article', { name: 'Tagihan SFD/2026/T4/001' })
    expect(screen.getByRole('heading', { level: 1, name: 'Tagihan Langganan' })).toBeInTheDocument()
    expect(lembar).toHaveTextContent('Pemerintah Desa Sungai Sialang')
    expect(lembar).toHaveTextContent('Kecamatan Teluk Meranti, Kabupaten Pelalawan')
    expect(lembar).toHaveTextContent('Triwulan IV 2026 (1 Oktober 2026 - 31 Desember 2026)')
    expect(lembar).toHaveTextContent('Rp3.000.127')
    expect(lembar).toHaveTextContent('Harga paket Rp3.000.000 + kode unik 127 = Rp3.000.127')
    expect(lembar).toHaveTextContent('15 Oktober 2026')
    expect(lembar).toHaveTextContent('Bank Contoh Nusantara')
    expect(lembar).toHaveTextContent('000 1234 5678')
    expect(lembar).toHaveTextContent('PT Sinfodes Contoh (demo)')
    expect(lembar).toHaveTextContent('Setelah transfer, unggah bukti di panel desa: Pengaturan → Langganan. Transfer tepat sesuai nominal supaya pembayaran mudah dicocokkan.')
    expect(lembar).toHaveTextContent('Dokumen demo. Rekening di atas bukan rekening sungguhan.')
  })
  it('tagihan belum dibayar tanpa baris status; tagihan dibatalkan menampilkan statusnya beserta alasan', () => {
    const { unmount } = render(<LembarTagihan tagihan={contoh()} />)
    expect(screen.queryByText(/^Status:/)).not.toBeInTheDocument()
    unmount()
    render(<LembarTagihan tagihan={contoh({ status: 'dibatalkan', dibatalkan: { alasan: 'Salah nominal paket.', pada: '2026-09-18T10:00:00+07:00', olehNama: 'Dina' } })} />)
    expect(screen.getByText('Status: Dibatalkan (Salah nominal paket.)')).toBeInTheDocument()
  })
})
