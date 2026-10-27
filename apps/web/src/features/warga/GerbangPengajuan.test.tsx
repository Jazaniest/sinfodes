import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWarga } from '@/test/render'
import { contohSesiWarga } from '@/test/sesi'
import { GerbangPengajuan } from './GerbangPengajuan'

function sesi(status: 'Aktif' | 'Ditangguhkan') {
  const dasar = contohSesiWarga()
  return { ...dasar, desa: { ...dasar.desa, status } }
}

describe('Gerbang pengajuan warga (rencana 7D-2 Tugas 4)', () => {
  it('desa Ditangguhkan: pesan tutup menggantikan formulir', () => {
    renderWarga(
      <GerbangPengajuan>
        <form aria-label="Formulir ajukan" />
      </GerbangPengajuan>,
      sesi('Ditangguhkan'),
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Pengajuan ditutup sementara' })).toBeInTheDocument()
    expect(screen.getByText('Layanan pengajuan Desa Sungai Sialang sedang ditutup. Silakan datang ke kantor desa.')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Formulir ajukan' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/warga')
  })
  it('desa Aktif: formulir tampil', () => {
    renderWarga(
      <GerbangPengajuan>
        <form aria-label="Formulir ajukan" />
      </GerbangPengajuan>,
      sesi('Aktif'),
    )
    expect(screen.getByRole('form', { name: 'Formulir ajukan' })).toBeInTheDocument()
  })
})
