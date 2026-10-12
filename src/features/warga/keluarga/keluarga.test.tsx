import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderWarga } from '@/test/render'
import { KeluargaSaya } from './KeluargaSaya'

pakaiApiTiruan()

describe('Keluarga saya (SPEC §10)', () => {
  it('anggota KK dengan NIK disamarkan; ketuk untuk menampilkan, ketuk lagi untuk menyembunyikan', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<KeluargaSaya />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Keluarga saya' })).toBeInTheDocument()
    expect(screen.getByText('RT 004/RW 002, Dusun I Kampung Tengah, Desa Sungai Sialang')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tampilkan nomor KK' })).toHaveTextContent(/^•••• •••• •••• \d{4}$/)
    const nik = screen.getByRole('button', { name: 'Tampilkan NIK Siti Rahmah' })
    expect(nik).toHaveTextContent('•••• •••• •••• 8002')
    expect(screen.queryByText('140509 520391 8002')).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(nik)
    expect(screen.getByRole('button', { name: 'Sembunyikan NIK Siti Rahmah' })).toHaveTextContent('140509 520391 8002')
    await user.click(screen.getByRole('button', { name: 'Sembunyikan NIK Siti Rahmah' }))
    expect(screen.getByRole('button', { name: 'Tampilkan NIK Siti Rahmah' })).toHaveTextContent('•••• •••• •••• 8002')
  })
  it('setiap anggota punya tautan Laporkan; laporan yang dikirim beserta statusnya', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<KeluargaSaya />)
    const lapor = await screen.findByRole('link', { name: 'Ada data yang salah? Laporkan (Nur Aini)' })
    expect(lapor).toHaveAttribute('href', '/warga/keluarga/lapor?anggota=pdk_nur_aini')
    const laporan = screen.getByRole('region', { name: 'Laporan saya' })
    expect(laporan).toHaveTextContent('Pekerjaan Syahrial: Wiraswasta')
    expect(laporan).toHaveTextContent('Sedang ditinjau kantor desa')
  })
})
