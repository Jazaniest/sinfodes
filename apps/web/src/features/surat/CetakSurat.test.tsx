import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { salinTataLetak, TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import type { PropsLembarSurat } from '@/ui/dokumen/LembarSurat'
import { CetakSurat } from './CetakSurat'

const LEMBAR: PropsLembarSurat = {
  kop: { kabupaten: 'Pelalawan', kecamatan: 'Teluk Meranti', desa: 'Sungai Sialang', alamat: 'Jalan Lintas Teluk Meranti Km 4', kodePos: '28353', surel: '' },
  isi: { judul: 'SURAT KETERANGAN DOMISILI', pembuka: 'Yang bertanda tangan di bawah ini…', blok: [], tempatTanggal: 'Sungai Sialang, 24 September 2026' },
  nomor: '470/087/SS/IX/2026',
  tandaTangan: { tempatTanggal: 'Sungai Sialang, 24 September 2026', jabatan: 'Kepala Desa Sungai Sialang', atasNama: null, nama: 'H. Muhammad Nasir', nip: null, mode: 'basah', qr: null },
  tataLetak: { ...salinTataLetak(TATA_LETAK_SIAP.standar), kertas: { ukuran: 'F4', margin: TATA_LETAK_SIAP.standar.kertas.margin } },
  verifikasi: null,
  simulasi: false,
}

describe('CetakSurat (SPEC §7.4: Cetak dan Unduh PDF)', () => {
  it('membuka dialog cetak sekali dengan ukuran halaman sesuai kertas; selesai setelah afterprint', () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onSelesai = vi.fn()
    const { container } = render(<CetakSurat lembar={LEMBAR} onSelesai={onSelesai} />)
    expect(cetak).toHaveBeenCalledOnce()
    expect(container.querySelector('style')?.textContent).toBe('@page { size: 215mm 330mm; margin: 0; }')
    expect(within(screen.getByRole('region', { name: 'Lembar cetak' })).getByRole('article')).toHaveTextContent('SURAT KETERANGAN DOMISILI')
    window.dispatchEvent(new Event('afterprint'))
    expect(onSelesai).toHaveBeenCalledOnce()
  })
  it('kertas A4', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    const { container } = render(<CetakSurat lembar={{ ...LEMBAR, tataLetak: TATA_LETAK_SIAP.standar }} onSelesai={vi.fn()} />)
    expect(container.querySelector('style')?.textContent).toBe('@page { size: A4; margin: 0; }')
  })
})
