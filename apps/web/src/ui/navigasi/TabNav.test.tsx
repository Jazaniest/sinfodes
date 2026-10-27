import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TabNav } from './TabNav'

describe('TabNav (SPEC §5.2)', () => {
  it('tab aktif bertanda halaman; angka ikut dibacakan beserta labelnya', () => {
    render(
      <TabNav
        label="Status"
        items={[
          { label: 'Menunggu', href: '/a', aktif: true, hitungan: { nilai: 7, label: 'permohonan' } },
          { label: 'Selesai', href: '/b', aktif: false },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Menunggu, 7 permohonan' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Selesai' })).not.toHaveAttribute('aria-current')
  })
})
