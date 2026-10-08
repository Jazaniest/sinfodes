import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'
import { MenuAksi } from './Menu'
import { PopoverTombol } from './Popover'

function LaciUji() {
  const [buka, setBuka] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setBuka(true)}>
        Buka laci
      </button>
      <Drawer isOpen={buka} onOpenChange={setBuka} judul="Siti Rahmah" aksi={<button type="button">Buka profil</button>}>
        <p>Isi laci</p>
      </Drawer>
    </>
  )
}

describe('Drawer', () => {
  it('dialog berjudul; tertutup lewat tombol Tutup maupun Esc', async () => {
    const user = userEvent.setup()
    render(<LaciUji />)
    await user.click(screen.getByRole('button', { name: 'Buka laci' }))
    expect(screen.getByRole('dialog', { name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.getByText('Isi laci')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buka profil' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Buka laci' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('PopoverTombol', () => {
  it('membuka panel berlabel dan bisa ditutup dari dalam', async () => {
    const user = userEvent.setup()
    render(
      <PopoverTombol label="Atur kolom" judul="Atur kolom">
        {(tutup) => (
          <button type="button" onClick={tutup}>
            Selesai
          </button>
        )}
      </PopoverTombol>,
    )
    await user.click(screen.getByRole('button', { name: 'Atur kolom' }))
    expect(screen.getByRole('dialog', { name: 'Atur kolom' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('MenuAksi', () => {
  it('menjalankan aksi item', async () => {
    const user = userEvent.setup()
    const keluar = vi.fn()
    render(<MenuAksi pemicu={<Button>Rosmiati</Button>} items={[{ id: 'keluar', label: 'Keluar', onAction: keluar }]} />)
    await user.click(screen.getByRole('button', { name: 'Rosmiati' }))
    await user.click(screen.getByRole('menuitem', { name: 'Keluar' }))
    expect(keluar).toHaveBeenCalledOnce()
  })
})
