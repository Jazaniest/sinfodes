import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { StatistikPublik } from './StatistikPublik'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Statistik website desa (SPEC §9: hanya agregat)', () => {
  it('jumlah jiwa, laki-laki, perempuan, dan keluarga; piramida dan grafik batang tanpa tautan ke daftar penduduk', async () => {
    renderPublik(<StatistikPublik />)
    expect(screen.getByRole('heading', { level: 1, name: 'Statistik penduduk' })).toBeInTheDocument()
    expect(await screen.findByText(/^[\d.]+ jiwa · [\d.]+ laki-laki · [\d.]+ perempuan · [\d.]+ keluarga$/)).toBeInTheDocument()
    expect(screen.getByText('Keadaan 24 September 2026')).toBeInTheDocument()
    const piramida = screen.getByRole('region', { name: 'Piramida penduduk' })
    expect(within(piramida).getByRole('list', { name: 'Piramida penduduk' })).toBeInTheDocument()
    for (const judul of ['Jumlah per dusun', 'Agama', 'Pendidikan', 'Pekerjaan (10 teratas)', 'Status perkawinan']) {
      expect(screen.getByRole('region', { name: judul })).toBeInTheDocument()
    }
    expect(screen.queryByRole('region', { name: 'Kepemilikan KTP-el' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
  it('Lihat sebagai tabel: setiap grafik menjadi tabel dengan jumlah dan persen (SPEC §4.6)', async () => {
    renderPublik(<StatistikPublik />)
    await userEvent.setup().click(await screen.findByRole('checkbox', { name: 'Lihat sebagai tabel' }))
    expect(screen.getByRole('table', { name: 'Piramida penduduk' })).toHaveTextContent(/Kelompok umurLaki-lakiPerempuanJumlah/)
    expect(screen.getByRole('table', { name: 'Agama' })).toHaveTextContent(/Islam[\d.]+[\d,]+%/)
    expect(screen.getAllByRole('table')).toHaveLength(6)
    expect(screen.queryByRole('list', { name: 'Piramida penduduk' })).not.toBeInTheDocument()
  })
  it('desa tanpa penduduk tercatat: keterangan, bukan grafik kosong', async () => {
    ubahDb((d) => {
      d.penduduk = d.penduduk.filter((p) => p.desaId !== 'desa_sungai_sialang')
    })
    renderPublik(<StatistikPublik />)
    expect(await screen.findByText('Belum ada data penduduk')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Lihat sebagai tabel' })).not.toBeInTheDocument()
  })
})
