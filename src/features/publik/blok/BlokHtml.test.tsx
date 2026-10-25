import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BlokTampil } from '@/domain/publik/schema'
import { renderPublik } from '@/test/render'
import { BlokHtml } from './BlokHtml'

type BlokHtmlTampil = Extract<BlokTampil, { jenis: 'html' }>

const blok = {
  id: 'blk_html01',
  jenis: 'html',
  varian: 'bingkai',
  lebar: 'penuh',
  tersembunyi: false,
  isi: { htmlId: 'html_peta01' },
  data: { nama: 'Peta desa', kode: '<p>Peta desa</p>', tinggi: { mode: 'otomatis' } },
} as BlokHtmlTampil

/** Kirim pesan `message` ke jendela halaman seperti yang dilakukan bingkai (keputusan 7). */
function kirimPesan(data: unknown, dari: MessageEventSource | null): void {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { source: dari, data }))
  })
}

describe('BlokHtml (7G Tugas 4)', () => {
  it('bingkai srcdoc bersandbox allow-scripts, referrerpolicy no-referrer, dan title nama blok', () => {
    renderPublik(<BlokHtml blok={blok} />)
    const iframe = screen.getByTitle('Peta desa') as HTMLIFrameElement
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(iframe.getAttribute('loading')).toBe('lazy')
    const doc = iframe.getAttribute('srcdoc') as string
    expect(doc).toContain('<p>Peta desa</p>')
    expect(doc).toContain("parent.postMessage({tipe:'sinfodes-tinggi'") // skrip tinggi otomatis ikut
    expect(doc).toContain(':root{--desa-') // variabel kontrak tema identitas website
  })

  it('tinggi otomatis mulai 150 px, mengikuti pesan bingkai, dan dipotong 40-3000 px', () => {
    renderPublik(<BlokHtml blok={blok} />)
    const iframe = screen.getByTitle('Peta desa') as HTMLIFrameElement
    expect(iframe.style.height).toBe('150px')
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: 640 }, iframe.contentWindow)
    expect(iframe.style.height).toBe('640px')
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: 5000 }, iframe.contentWindow)
    expect(iframe.style.height).toBe('3000px')
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: -5 }, iframe.contentWindow)
    expect(iframe.style.height).toBe('40px')
  })

  it('pesan dari jendela lain dan pesan palsu diabaikan tanpa galat', () => {
    renderPublik(<BlokHtml blok={blok} />)
    const iframe = screen.getByTitle('Peta desa') as HTMLIFrameElement
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: 900 }, window)
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: 900 }, null)
    kirimPesan({ tipe: 'lain', tinggi: 900 }, iframe.contentWindow)
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: '900' }, iframe.contentWindow)
    kirimPesan('halo', iframe.contentWindow)
    expect(iframe.style.height).toBe('150px')
  })

  it('tinggi tetap memakai px dan tidak mengikuti pesan', () => {
    renderPublik(<BlokHtml blok={{ ...blok, data: { ...blok.data, nama: 'Tetap', tinggi: { mode: 'tetap', px: 260 } } }} />)
    const iframe = screen.getByTitle('Tetap') as HTMLIFrameElement
    expect(iframe.style.height).toBe('260px')
    kirimPesan({ tipe: 'sinfodes-tinggi', tinggi: 900 }, iframe.contentWindow)
    expect(iframe.style.height).toBe('260px')
  })

  it('muat kedua memasang ulang srcdoc (bingkai berpindah halaman, keputusan 6)', () => {
    renderPublik(<BlokHtml blok={blok} />)
    const iframe = screen.getByTitle('Peta desa') as HTMLIFrameElement
    const srcdoc = iframe.getAttribute('srcdoc') as string
    iframe.removeAttribute('srcdoc') // amati pemasangan ulang dari penangan `load`
    fireEvent.load(iframe)
    expect(iframe.hasAttribute('srcdoc')).toBe(false) // muat awal dibiarkan
    fireEvent.load(iframe)
    expect(iframe.getAttribute('srcdoc')).toBe(srcdoc) // muat kedua memasang ulang
    iframe.removeAttribute('srcdoc')
    fireEvent.load(iframe)
    expect(iframe.hasAttribute('srcdoc')).toBe(false) // muat hasil pasang ulang diperlakukan sebagai muat awal
    fireEvent.load(iframe)
    expect(iframe.getAttribute('srcdoc')).toBe(srcdoc)
  })
})
