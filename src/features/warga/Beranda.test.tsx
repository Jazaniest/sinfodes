import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderWarga } from '@/test/render'
import { contohSesiWarga } from '@/test/sesi'
import { Beranda } from './Beranda'

pakaiApiTiruan()

describe('Beranda warga (SPEC §10)', () => {
  it('Siti: sapaan, permohonan beserta posisinya, pengumuman, posyandu untuk balitanya, dan bantuan', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<Beranda sekarang={SEKARANG_UJI} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.getByText('Selamat pagi,')).toBeInTheDocument()
    const surat = await screen.findAllByRole('link', { name: /Surat Keterangan Domisili \(SKD\)/ })
    const domisili = surat.find((a) => a.textContent?.includes('Sedang diproses petugas desa'))
    expect(domisili).toHaveAttribute('href', expect.stringMatching(/^\/warga\/riwayat\/srt_/))
    expect(within(screen.getByRole('region', { name: 'Pengumuman desa' })).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'Jadwal posyandu' })).toHaveTextContent('Muhammad Alif (2 tahun 10 bulan)')
    const bantuan = screen.getByRole('region', { name: 'Bantuan yang diterima' })
    expect(within(bantuan).getByText('BLT Dana Desa 2026')).toBeInTheDocument()
    expect(within(bantuan).getByText('Bantuan Pangan Beras 2026')).toBeInTheDocument()
  })
  it('Zulkifli: SKU sedang diperbaiki; keluarganya tanpa balita, jadi tanpa jadwal posyandu', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    renderWarga(<Beranda sekarang={SEKARANG_UJI} />, {
      ...contohSesiWarga(),
      penduduk: { id: 'pdk_zulkifli', nama: 'Zulkifli', nik: '1405091706848005', keluargaId: 'kk_zulkifli' },
      whatsapp: '081371185570',
    })
    const sku = await screen.findAllByRole('link', { name: /Surat Keterangan Usaha \(SKU\)/ })
    expect(sku.some((a) => a.textContent?.includes('Sedang diperbaiki petugas desa'))).toBe(true)
    expect(screen.queryByRole('region', { name: 'Jadwal posyandu' })).not.toBeInTheDocument()
  })
  it('koneksi gagal → pesan galat dengan Coba lagi', async () => {
    aturModeJaringan('gagal')
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<Beranda sekarang={SEKARANG_UJI} />)
    expect(await screen.findByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})
