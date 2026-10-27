import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { DaftarLaporan } from './DaftarLaporan'
import { LaporanBulanan } from './LaporanBulanan'

pakaiApiTiruan()

const pasang = (ui: React.ReactElement, akun: string = AKUN_KABUPATEN_UJI.admin) => {
  masukKabupatenSebagai(akun)
  renderKabupaten(ui, contohSesiKabupaten(akun))
  return userEvent.setup()
}

describe('Laporan bulanan kabupaten (SPEC-V0.2 §8.3 butir 7)', () => {
  it('daftar: satu tautan per bulan yang sudah tutup', async () => {
    pasang(<DaftarLaporan />, AKUN_KABUPATEN_UJI.peninjau)
    expect(screen.getByRole('heading', { level: 1, name: 'Laporan bulanan' })).toBeInTheDocument()
    expect(screen.getByText('Laporan tersedia untuk bulan yang sudah tutup.')).toBeInTheDocument()
    const daftar = await screen.findByRole('list', { name: 'Bulan laporan' })
    const tautan = within(daftar).getAllByRole('link')
    expect(tautan.map((a) => a.textContent)).toEqual(['Agustus 2026', 'Juli 2026', 'Juni 2026', 'Mei 2026', 'April 2026', 'Maret 2026'])
    expect(tautan[0]).toHaveAttribute('href', '/kabupaten/admin/laporan/2026-08')
  })
  it('Agustus 2026: sampul lalu lima bagian berurutan', async () => {
    pasang(<LaporanBulanan bulan="2026-08" sekarang={SEKARANG_UJI} />)
    const lembar = await screen.findByRole('article', { name: 'Laporan bulanan Agustus 2026' })
    const sampul = within(lembar).getByRole('region', { name: 'Sampul' })
    expect(within(sampul).getByRole('img', { name: 'Lambang contoh' })).toBeInTheDocument()
    expect(sampul).toHaveTextContent('Laporan Bulanan')
    expect(sampul).toHaveTextContent('Desa Digital Kabupaten Pelalawan')
    expect(sampul).toHaveTextContent('Agustus 2026')
    expect(sampul).toHaveTextContent('Disusun dari data Sinfodes · dicetak 24 September 2026')
    expect(within(lembar).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Ringkasan kabupaten', 'Rincian per kecamatan', 'Podium Agustus 2026', 'Desa yang perlu perhatian', 'Dana Desa', 'Lampiran: tabel per desa',
    ])
    expect(within(lembar).getByText(/^\d+ dari 104 desa sudah memakai Sinfodes pada akhir Agustus 2026\.$/)).toBeInTheDocument()
    const perhatian = within(lembar).getByRole('region', { name: 'Desa yang perlu perhatian' })
    expect(within(perhatian).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Tanpa surat terbit bulan ini', 'Realisasi Dana Desa tertinggal', 'Tenggat laporan yang terlewat',
    ])
    expect(perhatian).toHaveTextContent('Tidak ada.')
    expect(within(lembar).getByRole('table', { name: 'Lampiran: tabel per desa' }).querySelectorAll('tbody tr')).toHaveLength(32)
  })
  it('Cetak atau simpan PDF membuka dialog cetak peramban', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const user = pasang(<LaporanBulanan bulan="2026-08" sekarang={SEKARANG_UJI} />)
    await screen.findByRole('article', { name: 'Laporan bulanan Agustus 2026' })
    expect(screen.getByText('Pilih “Simpan sebagai PDF” di jendela cetak.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cetak atau simpan PDF' }))
    expect(cetak).toHaveBeenCalledOnce()
    cetak.mockRestore()
  })
  it('bulan yang belum tutup: keterangan dan tautan kembali ke daftar', async () => {
    pasang(<LaporanBulanan bulan="2026-09" sekarang={SEKARANG_UJI} />)
    expect(await screen.findByText('Laporan bulan ini belum tersedia')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke daftar laporan' })).toHaveAttribute('href', '/kabupaten/admin/laporan')
  })
  it('Podium Agustus 2026: sembilan baris kategori, juara 1 sampai 3 (7C-1)', async () => {
    pasang(<LaporanBulanan bulan="2026-08" sekarang={SEKARANG_UJI} />)
    const lembar = await screen.findByRole('article', { name: 'Laporan bulanan Agustus 2026' })
    const tabel = within(lembar).getByRole('table', { name: 'Podium Agustus 2026' })
    expect(within(tabel).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Kategori', 'Juara 1', 'Juara 2', 'Juara 3'])
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(9)
    expect(within(baris[8]).getByRole('rowheader')).toHaveTextContent('Juara Umum')
  })
})
