import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { LayananPublik } from './LayananPublik'

pakaiApiTiruan()

describe('Layanan website desa (SPEC §9)', () => {
  it('surat yang bisa diajukan online beserta syarat dan perkiraan waktu; tombol ke layanan mandiri', async () => {
    renderPublik(<LayananPublik />)
    const surat = await screen.findByRole('region', { name: 'Surat yang bisa diajukan online' })
    expect(within(surat).getByText('Surat Keterangan Domisili (SKD)')).toBeInTheDocument()
    expect(surat).toHaveTextContent('Syarat: KTP, KK, Pengantar RT')
    expect(surat).toHaveTextContent(/Biasanya selesai/)
    expect(within(surat).getByRole('link', { name: 'Ajukan dari HP' })).toHaveAttribute('href', '/warga/ajukan')
  })
  it('jam layanan kantor dan jadwal posyandu setiap dusun, dengan jangkar #posyandu dari Beranda', async () => {
    renderPublik(<LayananPublik />)
    const jam = await screen.findByRole('region', { name: 'Jam layanan kantor desa' })
    expect(within(jam).getByText('08.00-15.00 WIB')).toBeInTheDocument()
    expect(within(jam).getByText('Jumat')).toBeInTheDocument()
    const posyandu = screen.getByRole('region', { name: 'Jadwal posyandu' })
    expect(posyandu).toHaveAttribute('id', 'posyandu')
    expect(within(posyandu).getAllByRole('listitem')).toHaveLength(4)
    expect(posyandu).toHaveTextContent('Posyandu Melati · Dusun I Kampung Tengah')
  })
  it('dibuka dengan #posyandu dari Beranda: menggulir ke jadwal posyandu sesudah datanya dimuat', async () => {
    // jsdom tidak punya scrollIntoView; navigasi berjangkar terjadi sebelum data Layanan tersedia.
    const gulir = vi.fn()
    Element.prototype.scrollIntoView = gulir
    window.location.hash = '#posyandu'
    try {
      renderPublik(<LayananPublik />)
      await screen.findByRole('region', { name: 'Jadwal posyandu' })
      await waitFor(() => expect(gulir).toHaveBeenCalledTimes(1))
      expect(gulir.mock.contexts[0]).toHaveAttribute('id', 'posyandu')
    } finally {
      window.location.hash = ''
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })
})
