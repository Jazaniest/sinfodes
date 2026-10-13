import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { tautanWhatsapp } from '@/domain/format/whatsapp'
import { pesanUmkm } from '@/domain/publik/potensi'
import { ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { PotensiPublik } from './PotensiPublik'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Potensi desa (SPEC §9)', () => {
  it('enam potensi dengan kategori, ringkasan, isi, dan foto berkredit', async () => {
    renderPublik(<PotensiPublik />)
    expect(screen.getByRole('heading', { level: 1, name: 'Potensi desa' })).toBeInTheDocument()
    const potensi = await screen.findByRole('region', { name: 'Potensi' })
    expect(within(potensi).getAllByRole('article').map((a) => a.id)).toEqual([
      'ptn_ss_01', 'ptn_ss_02', 'ptn_ss_03', 'ptn_ss_04', 'ptn_ss_05', 'ptn_ss_06',
    ])
    const madu = within(potensi).getByRole('article', { name: 'Madu sialang' })
    expect(madu).toHaveTextContent('Hasil hutan')
    expect(madu).toHaveTextContent('tradisi menumbai')
    const foto = within(madu).getByRole('img', { name: 'Panen madu sialang' })
    expect(foto).toHaveAttribute('loading', 'lazy')
    expect(foto.closest('figure')).toHaveTextContent('Foto: Zhilal Darma · CC BY-SA 4.0')
  })
  it('UMKM: tombol WhatsApp ke penjual dengan pesan pembuka, di tab baru, bernama sesuai usahanya (fokus review 4)', async () => {
    renderPublik(<PotensiPublik />)
    const umkm = await screen.findByRole('region', { name: 'Usaha warga (UMKM)' })
    expect(within(umkm).getAllByRole('listitem')).toHaveLength(5)
    const tombol = within(umkm).getAllByRole('link')
    expect(tombol).toHaveLength(5)
    expect(new Set(tombol.map((t) => t.getAttribute('aria-label'))).size).toBe(5)
    const wa = within(umkm).getByRole('link', { name: 'Pesan lewat WhatsApp ke Toko Bangunan Rengas Jaya' })
    expect(wa).toHaveAttribute('href', tautanWhatsapp('081371185570', pesanUmkm('Toko Bangunan Rengas Jaya', 'Sungai Sialang')))
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281371185570\?text=Halo%2C/)
    expect(wa).toHaveAttribute('target', '_blank')
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer')
    expect(wa).toHaveTextContent('Pesan lewat WhatsApp')
    expect(umkm).toHaveTextContent('Zulkifli · Dusun III Teluk Rengas · 0813-7118-5570')
  })
  it('dibuka dari Beranda dengan #jangkar: menggulir ke potensi itu sesudah datanya dimuat', async () => {
    // jsdom tidak punya scrollIntoView; navigasi berjangkar terjadi sebelum data Potensi tersedia.
    const gulir = vi.fn()
    Element.prototype.scrollIntoView = gulir
    window.location.hash = '#ptn_ss_05'
    try {
      renderPublik(<PotensiPublik />)
      await screen.findByRole('article', { name: 'Ombak Bono' })
      await waitFor(() => expect(gulir).toHaveBeenCalledTimes(1))
      expect(gulir.mock.contexts[0]).toHaveAttribute('id', 'ptn_ss_05')
    } finally {
      window.location.hash = ''
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })
  it('desa yang belum menulis potensi dan UMKM: keterangan, bukan halaman kosong (fokus review 1)', async () => {
    ubahDb((d) => {
      d.potensi = []
      d.umkm = []
    })
    renderPublik(<PotensiPublik />)
    expect(await screen.findByText('Potensi desa belum ditulis.')).toBeInTheDocument()
    expect(screen.getByText('Belum ada usaha warga yang terdaftar.')).toBeInTheDocument()
  })
})
