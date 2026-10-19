import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarSiaranDesa } from './DaftarSiaranDesa'

pakaiApiTiruan()

describe('Siaran kabupaten di panel desa (SPEC-V0.2 §8.4 Di panel desa)', () => {
  it('Operator: dari Kabupaten Pelalawan, BLT tebal dengan tenggat, ralat ditarik', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<DaftarSiaranDesa sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(screen.getByRole('heading', { level: 1, name: 'Siaran kabupaten' })).toBeInTheDocument()
    expect(await screen.findByText('Dari Kabupaten Pelalawan.')).toBeInTheDocument()
    const daftar = screen.getByRole('list', { name: 'Siaran' })
    const butir = within(daftar).getAllByRole('listitem')
    expect(butir).toHaveLength(4)
    const blt = within(butir[0]).getByRole('link', { name: 'Pemutakhiran data penerima BLT-DD triwulan IV' })
    expect(blt).toHaveAttribute('href', '/admin/siaran/srn_pll_blt')
    expect(blt).toHaveClass('font-semibold')
    expect(butir[0]).toHaveTextContent('Perlu tindak lanjut sampai 5 Oktober 2026')
    expect(butir[1]).toHaveTextContent('Ditarik oleh kabupaten')
    expect(butir[2]).toHaveTextContent('Sudah ditindaklanjuti')
    expect(butir[3]).toHaveTextContent('Dibaca')
    expect(within(butir[3]).getByRole('link')).not.toHaveClass('font-semibold')
  })
})
