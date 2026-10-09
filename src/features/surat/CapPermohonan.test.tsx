import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CapPermohonan } from './CapPermohonan'

describe('CapPermohonan (SPEC §4.4)', () => {
  it('status sebagai cap, dengan keterangan dikembalikan atau tahap tanda tangan', () => {
    const { rerender } = render(<CapPermohonan p={{ status: 'diproses', tahap: null, dikembalikan: true }} />)
    expect(screen.getByText('Diproses')).toHaveAttribute('data-varian', 'diproses')
    expect(screen.getByText('dikembalikan')).toBeInTheDocument()
    rerender(<CapPermohonan p={{ status: 'perlu-ttd', tahap: 'paraf', dikembalikan: false }} />)
    expect(screen.getByText('Perlu TTD')).toBeInTheDocument()
    expect(screen.getByText('tahap paraf')).toBeInTheDocument()
    rerender(<CapPermohonan p={{ status: 'perlu-ttd', tahap: 'tanda-tangan', dikembalikan: false }} />)
    expect(screen.getByText('tahap tanda tangan')).toBeInTheDocument()
    rerender(<CapPermohonan p={{ status: 'dibatalkan', tahap: null, dikembalikan: false }} />)
    expect(screen.getByText('Dibatalkan')).toHaveClass('line-through')
    expect(screen.queryByText('dikembalikan')).not.toBeInTheDocument()
  })
})
