import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ComboBoxCari, type OpsiCari } from './ComboBoxCari'

const SEMUA: OpsiCari[] = [
  { id: 'a', label: 'Siti Rahmah', keterangan: '140509 520391 8002' },
  { id: 'b', label: 'Siti Aminah', keterangan: '140509 470572 8001' },
]

function Uji({ onPilih }: { onPilih: (id: string | null) => void }) {
  const [kata, setKata] = useState('')
  const [terpilih, setTerpilih] = useState<string | null>(null)
  // Meniru hasil API: daftar muncul untuk kata ≥ 2 karakter, tanpa disaring ulang di layar (NIK tidak ada di label).
  const opsi = kata.trim().length >= 2 ? SEMUA : []
  return (
    <ComboBoxCari
      label="Ibu"
      kata={kata}
      onKata={setKata}
      opsi={opsi}
      terpilih={terpilih}
      onPilih={(id) => {
        setTerpilih(id)
        onPilih(id)
      }}
      teksKosong="Tidak ada penduduk yang cocok."
    />
  )
}

describe('ComboBoxCari', () => {
  it('opsi dari API tidak disaring ulang oleh teks yang diketik (mis. NIK)', async () => {
    const user = userEvent.setup()
    render(<Uji onPilih={vi.fn()} />)
    await user.click(screen.getByRole('combobox', { name: 'Ibu' }))
    await user.paste('1405095203')
    expect(await screen.findByRole('option', { name: /Siti Rahmah/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Siti Aminah/ })).toBeInTheDocument()
  })
  it('memilih opsi mengisi kotak dengan labelnya', async () => {
    const user = userEvent.setup()
    const onPilih = vi.fn()
    render(<Uji onPilih={onPilih} />)
    await user.click(screen.getByRole('combobox', { name: 'Ibu' }))
    await user.paste('Siti')
    await user.click(await screen.findByRole('option', { name: /Siti Rahmah/ }))
    expect(onPilih).toHaveBeenLastCalledWith('a')
    expect(screen.getByRole('combobox', { name: 'Ibu' })).toHaveValue('Siti Rahmah')
  })
})
