import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IsiLembar } from '@/domain/surat/isi-lembar'
import type { DataTandaTangan } from './BlokTandaTangan'
import { LembarSurat, type PropsLembarSurat } from './LembarSurat'
import { NomorSurat } from './NomorSurat'
import { PratinjauLembar } from './PratinjauLembar'
import { QrVerifikasi } from './QrVerifikasi'

const KOP = {
  kabupaten: 'Pelalawan', kecamatan: 'Teluk Meranti', desa: 'Sungai Sialang',
  alamat: 'Jalan Lintas Teluk Meranti Km 4, Sungai Sialang', kodePos: '28353', surel: 'pemdes@sungaisialang.desa.id',
}
const ISI: IsiLembar = {
  judul: 'SURAT KETERANGAN DOMISILI',
  pembuka: 'Yang bertanda tangan di bawah ini, Kepala Desa Sungai Sialang, menerangkan bahwa:',
  blok: [
    { jenis: 'tabel', baris: [{ label: 'Nama', nilai: 'SITI RAHMAH', tebal: true }, { label: 'NIK', nilai: '1405095203918002', tebal: false }] },
    { jenis: 'paragraf', teks: 'Nama tersebut di atas adalah benar penduduk Desa Sungai Sialang.' },
  ],
  tempatTanggal: 'Sungai Sialang, 24 September 2026',
}
const ISI_QR = 'https://demo.sinfodes.id/desa/sungai-sialang/verifikasi?kode=SS-7K3M-Q9TD'
const TTD: DataTandaTangan = {
  tempatTanggal: ISI.tempatTanggal, jabatan: 'Kepala Desa Sungai Sialang', atasNama: null, nama: 'H. Muhammad Nasir',
  mode: 'tte', qr: { isi: ISI_QR, kode: 'SS-7K3M-Q9TD' },
}
const DASAR: PropsLembarSurat = {
  kop: KOP, isi: ISI, nomor: '470/087/SS/IX/2026', tandaTangan: TTD, kertas: 'A4', huruf: 'Tinos',
  verifikasi: { kode: 'SS-7K3M-Q9TD', domain: 'sungaisialang.desa.id', isiQr: ISI_QR }, simulasi: false,
}
const lembar = (ubah: Partial<PropsLembarSurat> = {}) => render(<LembarSurat {...DASAR} {...ubah} />)

describe('LembarSurat (SPEC §7.5)', () => {
  it('kop, judul, nomor, tabel isi, dan tanda tangan elektronik dengan QR', () => {
    lembar()
    const surat = screen.getByRole('article', { name: 'Lembar surat keterangan domisili' })
    expect(within(surat).getByText('PEMERINTAH KABUPATEN PELALAWAN')).toBeInTheDocument()
    expect(within(surat).getByText('KECAMATAN TELUK MERANTI')).toBeInTheDocument()
    expect(within(surat).getByText('DESA SUNGAI SIALANG')).toBeInTheDocument()
    expect(
      within(surat).getByText('Jalan Lintas Teluk Meranti Km 4, Sungai Sialang, Kode Pos 28353 · pemdes@sungaisialang.desa.id'),
    ).toBeInTheDocument()
    expect(within(surat).getByRole('heading', { name: 'SURAT KETERANGAN DOMISILI' })).toBeInTheDocument()
    expect(within(surat).getByText('Nomor: 470/087/SS/IX/2026')).toBeInTheDocument()
    expect(within(surat).getByText('SITI RAHMAH')).toHaveClass('font-bold')
    expect(within(surat).getByText('Nama tersebut di atas adalah benar penduduk Desa Sungai Sialang.')).toBeInTheDocument()
    expect(within(surat).getByText('Sungai Sialang, 24 September 2026')).toBeInTheDocument()
    expect(within(surat).getByRole('img', { name: 'Kode QR verifikasi SS-7K3M-Q9TD' })).toBeInTheDocument()
    expect(within(surat).getByText('Ditandatangani secara elektronik')).toBeInTheDocument()
    expect(within(surat).getByText('H. Muhammad Nasir')).toHaveClass('underline')
    expect(surat.querySelector('footer')).toHaveTextContent(
      'Keaslian surat dapat diperiksa di sungaisialang.desa.id/verifikasi dengan kode SS-7K3M-Q9TD',
    )
    expect(surat.querySelector('footer')).not.toHaveTextContent('Simulasi')
    expect(surat).toHaveClass('font-surat-tinos', 'min-h-[29.7cm]')
  })
  it('mode demo: kaki surat menandai simulasi TTE', () => {
    lembar({ simulasi: true })
    expect(document.querySelector('footer')).toHaveTextContent('Simulasi TTE — demo Sinfodes')
  })
  it('tanda tangan basah: ruang kosong, QR pindah ke kaki surat', () => {
    lembar({ tandaTangan: { ...TTD, mode: 'basah', qr: null } })
    expect(screen.queryByText('Ditandatangani secara elektronik')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Kode QR verifikasi SS-7K3M-Q9TD' }).closest('footer')).not.toBeNull()
  })
  it('a.n. Kepala Desa oleh Sekretaris Desa', () => {
    lembar({ tandaTangan: { ...TTD, atasNama: 'Sekretaris Desa', nama: 'Hendri Saputra' } })
    expect(screen.getByText(/^a\.n\. Kepala Desa Sungai Sialang/)).toHaveTextContent('a.n. Kepala Desa Sungai SialangSekretaris Desa')
    expect(screen.getByText('Hendri Saputra')).toBeInTheDocument()
  })
  it('draf: nomor belum ada, tanpa QR dan tanpa kaki verifikasi; penanda tampil', () => {
    lembar({ nomor: null, tandaTangan: { ...TTD, qr: null }, verifikasi: null, penanda: <span>Draf</span> })
    expect(screen.getByText('Nomor: …')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('footer')).toBeNull()
    expect(screen.getByText('Draf')).toBeInTheDocument()
  })
  it('kertas F4 dan huruf Arimo', () => {
    lembar({ kertas: 'F4', huruf: 'Arimo' })
    expect(screen.getByRole('article')).toHaveClass('min-h-[33cm]', 'w-[21.5cm]', 'font-surat-arimo')
  })
})

describe('QrVerifikasi', () => {
  it('SVG berisi modul QR; isi berbeda → pola berbeda', () => {
    const { container, rerender } = render(<QrVerifikasi isi="SS-7K3M-Q9TD" label="QR" />)
    const pola = container.querySelector('path')?.getAttribute('d')
    expect(pola).toMatch(/^M\d+ \d+h1v1h-1z/)
    rerender(<QrVerifikasi isi="SS-AAAA-BBBB" label="QR" />)
    expect(container.querySelector('path')?.getAttribute('d')).not.toBe(pola)
  })
})

describe('NomorSurat dan PratinjauLembar', () => {
  it('nomor ditulis mono; yang belum bernomor diberi keterangan', () => {
    const { rerender } = render(<NomorSurat nomor="470/087/SS/IX/2026" />)
    expect(screen.getByText('470/087/SS/IX/2026')).toHaveClass('font-mono')
    rerender(<NomorSurat nomor={null} />)
    expect(screen.getByText('Diberikan saat ditandatangani')).toBeInTheDocument()
  })
  it('pratinjau: wilayah berlabel berisi lembar, tidak ikut dicetak', () => {
    render(
      <PratinjauLembar label="Pratinjau surat">
        <p>isi</p>
      </PratinjauLembar>,
    )
    const wilayah = screen.getByRole('region', { name: 'Pratinjau surat' })
    expect(wilayah).toHaveClass('print:hidden')
    expect(within(wilayah).getByText('isi')).toBeInTheDocument()
  })
})
