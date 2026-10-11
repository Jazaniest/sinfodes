import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Saklar } from './Saklar'

describe('Saklar', () => {
  it('peran switch dengan nama; menekannya membalik nilai', async () => {
    const onChange = vi.fn()
    render(
      <Saklar isSelected onChange={onChange}>
        Aktif
      </Saklar>,
    )
    const saklar = screen.getByRole('switch', { name: 'Aktif' })
    expect(saklar).toBeChecked()
    await userEvent.click(saklar)
    expect(onChange).toHaveBeenCalledWith(false)
  })
  it('label tersembunyi tetap menjadi nama; nonaktif tidak bisa diubah', async () => {
    const onChange = vi.fn()
    render(
      <Saklar isSelected={false} isDisabled labelTersembunyi onChange={onChange}>
        Layanan online Surat Keterangan Domisili
      </Saklar>,
    )
    const saklar = screen.getByRole('switch', { name: 'Layanan online Surat Keterangan Domisili' })
    expect(saklar).toBeDisabled()
    await userEvent.click(saklar)
    expect(onChange).not.toHaveBeenCalled()
  })
})
