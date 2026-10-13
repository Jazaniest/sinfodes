import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
    expect(within(jam).getByText('08.00–15.00 WIB')).toBeInTheDocument()
    expect(within(jam).getByText('Jumat')).toBeInTheDocument()
    const posyandu = screen.getByRole('region', { name: 'Jadwal posyandu' })
    expect(posyandu).toHaveAttribute('id', 'posyandu')
    expect(within(posyandu).getAllByRole('listitem')).toHaveLength(4)
    expect(posyandu).toHaveTextContent('Posyandu Melati · Dusun I Kampung Tengah')
  })
})
