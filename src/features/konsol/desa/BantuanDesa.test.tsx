import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { beriAksesSinfodes } from '@/api/pengaturan'
import { AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { DetailDesa } from './DetailDesa'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Detail desa Konsol › Keaktifan: akses bantuan (SPEC-V0.2 §5.3)', () => {
  it('tanpa akses dari desa: tidak ada tombol membuka panel', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    renderKonsol(<DetailDesa id="desa_sungai_sialang" tab="keaktifan" sekarang={SEKARANG_UJI} />)
    expect(await screen.findByText('Desa belum memberi akses bantuan.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buka panel desa (lihat saja)' })).not.toBeInTheDocument()
  })
  it('akses aktif: batas waktunya tampil, dengan tombol membuka panel lihat saja', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    renderKonsol(<DetailDesa id="desa_sungai_sialang" tab="keaktifan" sekarang={SEKARANG_UJI} />)
    expect(await screen.findByText(/^Akses bantuan aktif sampai /)).toBeInTheDocument()
    expect(screen.getByText('Data pribadi warga disamarkan.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buka panel desa (lihat saja)' })).toBeInTheDocument()
  })
})
