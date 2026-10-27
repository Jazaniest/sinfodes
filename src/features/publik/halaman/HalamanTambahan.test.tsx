import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { simpanDraf, terbitkan } from '@/api/website'
import { susunBlok } from '@/domain/website/blok'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { HalamanTambahan } from './HalamanTambahan'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Halaman tambahan website desa (rencana 7F-1 Tugas 6)', () => {
  it('halaman terbit: h1 judul halaman lalu susunan bloknya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const halaman = {
      id: 'hlm_uji001',
      nama: 'sejarah-kampung',
      judul: 'Sejarah Kampung',
      blok: [susunBlok({ id: 'blk_uji001', jenis: 'teks', isi: { judul: 'Awal mula', paragraf: ['Kampung ini dibuka tahun 1952.'], tautan: null } })],
    }
    await simpanDraf(null, { tema: TEMA_WARTA_BAWAAN('#1F4E79'), susunan: { ...susunanBawaan(), halaman: [halaman] } })
    await terbitkan('Tambah halaman.')
    renderPublik(<HalamanTambahan nama="sejarah-kampung" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sejarah Kampung' })).toBeInTheDocument()
    expect(screen.getByText('Kampung ini dibuka tahun 1952.')).toBeInTheDocument()
    expect(screen.getByText('Awal mula')).toBeInTheDocument()
  })
  it('nama yang tidak ada: halaman tidak ditemukan', async () => {
    renderPublik(<HalamanTambahan nama="belum-ada" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByText(/belum dibuat/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/desa/sungaisialang')
  })
})
