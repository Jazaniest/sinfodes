import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { TransparansiPublik } from './TransparansiPublik'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Transparansi website desa (SPEC §9)', () => {
  it('APBDes: ringkasan realisasi, pendapatan per sumber, belanja per bidang, dan pembiayaan', async () => {
    renderPublik(<TransparansiPublik />)
    const apbdes = await screen.findByRole('region', { name: 'APBDes 2026' })
    expect(apbdes).toHaveTextContent('Disinkronkan dari Siskeudes · 20 Sep 2026')
    expect(within(apbdes).getAllByRole('meter', { name: 'Pendapatan' })).toHaveLength(1)
    const pendapatan = within(apbdes).getByRole('region', { name: 'Pendapatan per sumber' })
    expect(within(pendapatan).getAllByRole('listitem')).toHaveLength(5)
    expect(pendapatan).toHaveTextContent('Dana Desa')
    expect(pendapatan).toHaveTextContent('Jumlah pendapatanRp1.826.650.000')
    expect(within(apbdes).getByRole('region', { name: 'Belanja per bidang' })).toHaveTextContent('Jumlah belanjaRp1.866.650.000')
    expect(within(apbdes).getByRole('region', { name: 'Pembiayaan' })).toHaveTextContent('Pembiayaan nettoRp40.000.000')
  })
  it('kegiatan pembangunan: status, progres fisik, penyerapan anggaran, dan foto progres berkredit; yang berjalan dulu', async () => {
    renderPublik(<TransparansiPublik />)
    const pembangunan = await screen.findByRole('region', { name: 'Kegiatan pembangunan' })
    const kegiatan = within(pembangunan).getAllByRole('article')
    expect(kegiatan).toHaveLength(7)
    const semenisasi = within(pembangunan).getByRole('article', { name: 'Semenisasi jalan lingkungan Dusun III (450 m)' })
    expect(kegiatan[0]).toBe(semenisasi)
    expect(semenisasi).toHaveAttribute('id', 'kgt_ss_01')
    expect(semenisasi).toHaveTextContent('Berjalan')
    expect(semenisasi).toHaveTextContent('Dana Desa')
    expect(within(semenisasi).getByRole('meter', { name: 'Progres fisik' })).toHaveAttribute('aria-valuetext', '70,0%')
    expect(within(semenisasi).getByRole('meter', { name: 'Penyerapan anggaran' })).toHaveAttribute('aria-valuetext', '62,0%')
    const foto = within(semenisasi).getByRole('img', { name: 'Semenisasi jalan Dusun III, progres 50%' })
    expect(foto).toHaveAttribute('loading', 'lazy')
    expect(foto.closest('figure')).toHaveTextContent('Foto: SATELIT BM · CC BY-SA 4.0')
    expect(within(semenisasi).getAllByRole('img')).toHaveLength(2)
    const pelantar = within(pembangunan).getByRole('article', { name: 'Pelantar perahu nelayan (1 unit)' })
    expect(pelantar).toHaveTextContent('Belum dimulai')
    expect(within(pelantar).queryAllByRole('img')).toHaveLength(0)
  })
  it('Unduh dokumen APBDes: dialog cetak terbuka sekali dengan lembar APBDes, lalu lembar dilepas (fokus review 5)', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    try {
      renderPublik(<TransparansiPublik />)
      await userEvent.setup().click(await screen.findByRole('button', { name: 'Unduh dokumen APBDes' }))
      expect(cetak).toHaveBeenCalledTimes(1)
      const lembar = screen.getByRole('region', { name: 'Lembar cetak APBDes 2026' })
      expect(lembar).toHaveTextContent('Anggaran Pendapatan dan Belanja Desa Tahun 2026')
      expect(lembar).toHaveTextContent('Desa Sungai Sialang · Kecamatan Teluk Meranti · Kabupaten Pelalawan')
      expect(within(lembar).getAllByRole('table')).toHaveLength(3)
      expect(lembar).toHaveTextContent('Jumlah pendapatanRp1.826.650.000')
      expect(lembar).toHaveTextContent('Pembiayaan nettoRp40.000.000')
      // Isi layar disembunyikan saat mencetak; hanya lembar yang tercetak.
      expect(screen.getByRole('heading', { level: 1, name: 'Transparansi' }).closest('.print\\:hidden')).not.toBeNull()
      act(() => {
        window.dispatchEvent(new Event('afterprint'))
      })
      expect(screen.queryByRole('region', { name: 'Lembar cetak APBDes 2026' })).not.toBeInTheDocument()
    } finally {
      cetak.mockRestore()
    }
  })
  it('desa yang belum mengumumkan APBDes dan kegiatan: keterangan, tanpa tombol unduh (fokus review 1)', async () => {
    ubahDb((d) => {
      d.apbdes = []
      d.kegiatan = []
    })
    renderPublik(<TransparansiPublik />)
    expect(await screen.findByText('APBDes belum diumumkan')).toBeInTheDocument()
    expect(screen.getByText('Belum ada kegiatan pembangunan yang diumumkan.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unduh dokumen APBDes' })).not.toBeInTheDocument()
  })
})
