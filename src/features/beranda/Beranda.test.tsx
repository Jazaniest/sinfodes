import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { Beranda } from './Beranda'

pakaiApiTiruan()

describe('Beranda (SPEC §5.3)', () => {
  it('operator: sapaan, perlu ditindaklanjuti, buku hari ini, keadaan desa', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(screen.getByRole('heading', { level: 1, name: 'Selamat pagi, Rosmiati' })).toBeInTheDocument()
    expect(screen.getByText(/Kamis, 24 September 2026/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '12 penduduk datanya belum lengkap' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk?preset=data-belum-lengkap',
    )
    const buku = screen.getByRole('region', { name: 'Buku hari ini' })
    expect(within(buku).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    expect(within(buku).getAllByText(/Kelahiran dicatat/).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText('2.812 jiwa dalam 806 KK · bulan ini 3 lahir, 1 meninggal, 2 datang, 4 pindah'),
    ).toBeInTheDocument()
  })
  it('Kepala Dusun II: tanpa tindakan dan buku hari ini; keadaan dusunnya', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kadus'))
    expect(await screen.findByRole('heading', { name: 'Keadaan Dusun II Sialang Jaya' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Perlu ditindaklanjuti' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Buku hari ini' })).not.toBeInTheDocument()
  })
  it('galat jaringan → pesan dan Coba lagi', async () => {
    masukSebagai(AKUN_UJI.operator)
    aturModeJaringan('gagal')
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(await screen.findByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
  it('operator: laporan warga di Perlu ditindaklanjuti (2A-3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('link', { name: '1 kelahiran dilaporkan warga, belum dicatat' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/mutasi/lahir?laporan=lap_kelahiran_rosnani',
    )
    expect(screen.getByRole('link', { name: '1 laporan perbaikan data dari warga' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk/pdk_syahrial',
    )
  })
  it('butir surat di Buku hari ini membuka ruang kerja surat (2B-1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    const buku = await screen.findByRole('region', { name: 'Buku hari ini' })
    const tautan = await within(buku).findAllByRole('link', { name: /^Permohonan / })
    expect(tautan[0]).toHaveAttribute('href', expect.stringMatching(/^\/admin\/surat\/srt_/))
  })
})
