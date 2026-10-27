import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { IsiLembar } from '@/domain/surat/isi-lembar'
import { POSISI_QR, type TataLetakSurat } from '@/domain/surat/tata-letak'
import { salinTataLetak, TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
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
const ISI_QR = 'https://demo.sinfodes.id/desa/sungaisialang/verifikasi?kode=SS-7K3M-Q9TD'
const TTD: DataTandaTangan = {
  tempatTanggal: ISI.tempatTanggal, jabatan: 'Kepala Desa Sungai Sialang', atasNama: null, nama: 'H. Muhammad Nasir', nip: null,
  mode: 'tte', qr: { isi: ISI_QR, kode: 'SS-7K3M-Q9TD' },
}
const DASAR: PropsLembarSurat = {
  kop: KOP, isi: ISI, nomor: '470/087/SS/IX/2026', tandaTangan: TTD, tataLetak: TATA_LETAK_SIAP.standar,
  verifikasi: { kode: 'SS-7K3M-Q9TD', domain: 'sungaisialang.desa.id', isiQr: ISI_QR }, simulasi: false,
}
const lembar = (ubah: Partial<PropsLembarSurat> = {}) => render(<LembarSurat {...DASAR} {...ubah} />)
const tata = (ubah: (t: TataLetakSurat) => void): TataLetakSurat => {
  const t = salinTataLetak(TATA_LETAK_SIAP.standar)
  t.siap = null
  ubah(t)
  return t
}
const BASAH: DataTandaTangan = { ...TTD, mode: 'basah', qr: null }
const LAMBANG = `data:image/png;base64,${'A'.repeat(64)}`
const MARGIN_40 = { atas: 40, kanan: 40, bawah: 40, kiri: 40 }

/** Kerangka markup: nama elemen, atribut selain class/style, dan teks, jadi hanya urutan dan isi yang dibandingkan. */
const kerangka = (html: string) => html.replace(/ (class|style)="[^"]*"/g, '')
const snapshotV01 = (nama: string) => readFileSync(resolve(process.cwd(), 'src/ui/dokumen/__snapshots__', `${nama}.html`), 'utf8')
const gaya = (e: HTMLElement) => ({
  atas: e.style.paddingTop, kanan: e.style.paddingRight, bawah: e.style.paddingBottom, kiri: e.style.paddingLeft,
  huruf: e.style.fontSize, spasi: e.style.lineHeight,
})

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
    lembar({ tandaTangan: BASAH })
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
  it('margin, ukuran huruf, dan jarak baris ditulis inline dalam mm dan pt, supaya layar dan cetak sama', () => {
    lembar()
    const surat = screen.getByRole('article')
    expect(gaya(surat)).toEqual({ atas: '20mm', kanan: '20mm', bawah: '20mm', kiri: '30mm', huruf: '12pt', spasi: '1.15' })
    expect(surat.querySelector('footer')).toHaveClass('pt-[0.4cm]')
  })
  it('kertas F4 dan huruf Arimo', () => {
    lembar({
      tataLetak: tata((t) => {
        t.kertas.ukuran = 'F4'
        t.huruf.keluarga = 'Arimo'
      }),
    })
    expect(screen.getByRole('article')).toHaveClass('min-h-[33cm]', 'w-[21.5cm]', 'font-surat-arimo')
  })
  it('kop memakai lambang yang diunggah desa; tanpa unggahan memakai lambang tiruan netral (3C)', () => {
    const dengan = lembar({ kop: { ...KOP, lambang: LAMBANG } })
    expect(dengan.container.querySelector('header img')).toHaveAttribute('src', LAMBANG)
    dengan.unmount()
    const tanpa = lembar()
    expect(tanpa.container.querySelector('header img')).toBeNull()
    expect(tanpa.container.querySelector('header svg')).not.toBeNull()
  })
})

describe('tata letak standar sama dengan lembar v0.1', () => {
  it('TTE: kerangka markup sama dengan yang dibuat kode lama', () => {
    expect(kerangka(lembar().container.innerHTML)).toBe(kerangka(snapshotV01('standar-tte')))
  })
  it('basah: kerangka markup sama dengan yang dibuat kode lama', () => {
    expect(kerangka(lembar({ tandaTangan: BASAH }).container.innerHTML)).toBe(kerangka(snapshotV01('standar-basah')))
  })
  it('draf: kerangka markup sama dengan yang dibuat kode lama', () => {
    const draf = lembar({ nomor: null, tandaTangan: { ...TTD, qr: null }, verifikasi: null })
    expect(kerangka(draf.container.innerHTML)).toBe(kerangka(snapshotV01('standar-draf')))
  })
})

describe('kop surat mengikuti tata letak (SPEC-V0.2 12.2)', () => {
  it('dua lambang tanpa lambang kabupaten: lambang tiruan netral berlabel "Lambang kabupaten" dan lambang desa tiruan', () => {
    const { container } = lembar({ tataLetak: TATA_LETAK_SIAP['dua-lambang'] })
    expect(screen.getByRole('img', { name: 'Lambang kabupaten' })).toBeInTheDocument()
    expect(container.querySelectorAll('header svg')).toHaveLength(2)
  })
  it('dua lambang dengan unggahan: kabupaten di kiri, desa di kanan', () => {
    const kab = `data:image/png;base64,${'B'.repeat(64)}`
    const { container } = lembar({ tataLetak: TATA_LETAK_SIAP['dua-lambang'], kop: { ...KOP, lambang: LAMBANG, lambangKabupaten: kab } })
    const gambar = [...container.querySelectorAll('header img')]
    expect(gambar.map((g) => g.getAttribute('src'))).toEqual([kab, LAMBANG])
    expect(screen.queryByRole('img', { name: 'Lambang kabupaten' })).not.toBeInTheDocument()
  })
  it('satu lambang di tengah: lambang di atas teks kop', () => {
    const { container } = lembar({ tataLetak: TATA_LETAK_SIAP['rata-tengah'] })
    const kop = container.querySelector('header > div')
    expect(kop).toHaveClass('flex-col')
    expect(kop?.querySelectorAll('svg')).toHaveLength(1)
    expect(kop?.firstElementChild?.tagName.toLowerCase()).toBe('svg')
  })
  it('garis kop: tunggal 1 garis, ganda 2 garis tipis, tebal-tipis 3 pt lalu 1 pt (seperti v0.1)', () => {
    const garis = (g: 'tunggal' | 'ganda' | 'tebal-tipis') => {
      const { container, unmount } = lembar({
        tataLetak: tata((t) => {
          t.kop.garis = g
        }),
      })
      const hasil = [...container.querySelectorAll('header > .border-tinta')].map((e) => e.className)
      unmount()
      return hasil
    }
    expect(garis('tunggal')).toHaveLength(1)
    expect(garis('tunggal')[0]).toContain('border-b-[1.5pt]')
    expect(garis('ganda')).toHaveLength(2)
    expect(garis('ganda').every((c) => c.includes('border-b-[0.75pt]'))).toBe(true)
    expect(garis('tebal-tipis').map((c) => /border-b-\[(\S+)\]/.exec(c)?.[1])).toEqual(['3pt', '1pt'])
  })
  it('baris kop kustom dengan sisipan; kata lain apa adanya', () => {
    lembar({
      tataLetak: tata((t) => {
        t.kop.baris = ['PEMERINTAH DESA {desa}', 'Kabupaten {kab}']
      }),
    })
    expect(screen.getByText('PEMERINTAH DESA SUNGAI SIALANG')).toBeInTheDocument()
    expect(screen.getByText('Kabupaten PELALAWAN')).toBeInTheDocument()
  })
  it('Review Focus 5: baris kop berisi markup tampil sebagai teks, bukan elemen', () => {
    const { container } = lembar({
      tataLetak: tata((t) => {
        t.kop.baris = ['<b>DESA {desa}</b>', '<img src=x onerror=alert(1)>']
      }),
    })
    expect(screen.getByText('<b>DESA SUNGAI SIALANG</b>')).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('header b')).toBeNull()
    expect(container.querySelector('header img')).toBeNull()
  })
})

describe('blok tanda tangan dan QR mengikuti tata letak', () => {
  it('rata tengah: blok tanda tangan di tengah dan kode verifikasi di bawah tanda tangan', () => {
    lembar({ tataLetak: TATA_LETAK_SIAP['rata-tengah'] })
    const blok = screen.getByText('H. Muhammad Nasir').closest('div.break-inside-avoid') as HTMLElement
    expect(blok).toHaveClass('mx-auto')
    expect(blok).not.toHaveClass('ml-auto')
    expect(within(blok).getByText(/Keaslian surat dapat diperiksa/)).toBeInTheDocument()
    expect(document.querySelector('article > footer')).toBeNull()
  })
  it('kanan: blok di kanan dan kode verifikasi di kaki surat', () => {
    lembar()
    expect(screen.getByText('H. Muhammad Nasir').closest('div.break-inside-avoid')).toHaveClass('ml-auto')
    expect(document.querySelector('article > footer')).toHaveTextContent('Keaslian surat dapat diperiksa')
  })
  it('QR kanan-bawah: kaki surat rata kanan, QR basah di kanan teks', () => {
    lembar({
      tandaTangan: BASAH,
      tataLetak: tata((t) => {
        t.qr.posisi = 'kanan-bawah'
      }),
    })
    const kaki = document.querySelector('article > footer')
    expect(kaki).toHaveClass('flex-row-reverse', 'text-right')
    expect(kaki).toHaveTextContent('Keaslian surat dapat diperiksa')
  })
  it.each(POSISI_QR.flatMap((posisi) => (['tte', 'basah'] as const).map((mode) => [posisi, mode] as const)))(
    'QR %s, mode %s: nomor, kode verifikasi, dan tepat satu QR verifikasi tetap tercetak',
    (posisi, mode) => {
      lembar({
        tandaTangan: mode === 'tte' ? TTD : BASAH,
        tataLetak: tata((t) => {
          t.qr.posisi = posisi
        }),
      })
      expect(screen.getByText('Nomor: 470/087/SS/IX/2026')).toBeInTheDocument()
      expect(screen.getByText('SS-7K3M-Q9TD', { selector: 'span' })).toBeInTheDocument()
      expect(screen.getAllByRole('img', { name: 'Kode QR verifikasi SS-7K3M-Q9TD' })).toHaveLength(1)
      expect(screen.getByText(/Keaslian surat dapat diperiksa di sungaisialang\.desa\.id\/verifikasi/)).toBeInTheDocument()
    },
  )
  it('urutan unsur mengikuti tata letak; NIP tampil hanya bila diaktifkan dan penanda tangan punya NIP', () => {
    const urut = tata((t) => {
      t.tandaTangan.urutan = ['nama', 'jabatan', 'tempat-tanggal', 'nip']
      t.tandaTangan.nip = true
    })
    const { container, rerender } = lembar({ tataLetak: urut, tandaTangan: { ...TTD, nip: '198203152010011004' } })
    const teks = (container.querySelector('div.break-inside-avoid') as HTMLElement).textContent ?? ''
    expect(teks.indexOf('H. Muhammad Nasir')).toBeLessThan(teks.indexOf('Kepala Desa Sungai Sialang'))
    expect(teks.indexOf('Kepala Desa Sungai Sialang')).toBeLessThan(teks.indexOf('Sungai Sialang, 24 September 2026'))
    expect(screen.getByText('NIP 198203152010011004')).toBeInTheDocument()
    rerender(<LembarSurat {...DASAR} tataLetak={urut} tandaTangan={{ ...TTD, nip: null }} />)
    expect(screen.queryByText(/^NIP /)).not.toBeInTheDocument()
    rerender(<LembarSurat {...DASAR} tataLetak={TATA_LETAK_SIAP.standar} tandaTangan={{ ...TTD, nip: '198203152010011004' }} />)
    expect(screen.queryByText(/^NIP /)).not.toBeInTheDocument()
  })
  it('NIP yang tidak ada di urutan tampil sesudah nama', () => {
    const t = tata((x) => {
      x.tandaTangan.urutan = ['tempat-tanggal', 'jabatan', 'nama']
      x.tandaTangan.nip = true
    })
    lembar({ tataLetak: t, tandaTangan: { ...TTD, nip: '198203152010011004' } })
    expect(screen.getByText('H. Muhammad Nasir').nextElementSibling).toHaveTextContent('NIP 198203152010011004')
  })
  it('tempat cap: kotak "Tempat cap" bila diaktifkan; tidak ikut tercetak di mode TTE, tercetak di mode basah', () => {
    const cap = tata((t) => {
      t.tandaTangan.tempatCap = true
    })
    const tte = lembar({ tataLetak: cap })
    expect(screen.getByText('Tempat cap').closest('div')).toHaveClass('print:hidden')
    tte.unmount()
    const basah = lembar({ tataLetak: cap, tandaTangan: BASAH })
    expect(screen.getByText('Tempat cap').closest('div')).not.toHaveClass('print:hidden')
    basah.unmount()
    lembar()
    expect(screen.queryByText('Tempat cap')).not.toBeInTheDocument()
  })
})

describe('kertas dan huruf mengikuti tata letak', () => {
  it('margin 40 mm: padding inline persis; Plex Serif memakai IBM Plex Serif; 13 pt spasi 1,5', () => {
    lembar({
      tataLetak: tata((t) => {
        t.kertas = { ukuran: 'F4', margin: MARGIN_40 }
        t.huruf = { keluarga: 'Plex Serif', ukuranPt: 13, spasi: 1.5 }
      }),
    })
    const surat = screen.getByRole('article')
    expect(gaya(surat)).toEqual({ atas: '40mm', kanan: '40mm', bawah: '40mm', kiri: '40mm', huruf: '13pt', spasi: '1.5' })
    expect(surat).toHaveClass('font-surat-plex')
  })
  it('Review Focus 3: F4 margin 40 mm dengan isi panjang tetap memuat nomor, kode verifikasi, dan QR (tidak ada overflow tersembunyi)', () => {
    const panjang: IsiLembar = {
      ...ISI,
      blok: Array.from({ length: 12 }, (_, i) => ({ jenis: 'paragraf' as const, teks: `Paragraf panjang ke-${i + 1}. `.repeat(20) })),
    }
    lembar({
      isi: panjang,
      tandaTangan: BASAH,
      tataLetak: tata((t) => {
        t.kertas = { ukuran: 'F4', margin: MARGIN_40 }
      }),
    })
    const surat = screen.getByRole('article')
    expect(surat.className).not.toMatch(/overflow/)
    expect(screen.getByText('Nomor: 470/087/SS/IX/2026')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Kode QR verifikasi SS-7K3M-Q9TD' })).toBeInTheDocument()
    expect(surat.querySelector('footer')).toHaveTextContent('SS-7K3M-Q9TD')
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
    // Tanpa min-w-0, lebar wadah mengikuti lembar 21 cm dan skala terkunci di 1 di layar sempit.
    expect(wilayah).toHaveClass('min-w-0')
    expect(within(wilayah).getByText('isi')).toBeInTheDocument()
  })
})
