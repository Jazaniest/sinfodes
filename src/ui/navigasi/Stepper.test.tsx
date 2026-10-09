import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Stepper } from './Stepper'

describe('Stepper (SPEC §4.4)', () => {
  it('langkah aktif ditandai aria-current; yang sudah lewat diberi keterangan selesai', () => {
    render(
      <Stepper
        label="Langkah impor"
        langkah={[
          { id: 'a', label: 'Unggah berkas' },
          { id: 'b', label: 'Cocokkan kolom' },
          { id: 'c', label: 'Periksa hasil' },
        ]}
        aktif="b"
      />,
    )
    const item = within(screen.getByRole('list', { name: 'Langkah impor' })).getAllByRole('listitem')
    expect(item[0]).toHaveTextContent('Unggah berkas (selesai)')
    expect(item[1]).toHaveAttribute('aria-current', 'step')
    expect(item[2]).not.toHaveAttribute('aria-current')
  })
})
