import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileDrop } from './FileDrop'

function pasang() {
  const onPilih = vi.fn()
  render(<FileDrop label="Berkas data penduduk" terima={['.xlsx', '.csv']} maksMb={1} onPilih={onPilih} />)
  const masukan = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!masukan) throw new Error('input berkas tidak ada')
  return { onPilih, masukan }
}

describe('FileDrop (SPEC §4.4)', () => {
  it('berkas yang sesuai diteruskan; ada tombol pilih berkas', async () => {
    const { onPilih, masukan } = pasang()
    expect(screen.getByRole('button', { name: 'Pilih berkas' })).toBeInTheDocument()
    expect(masukan).toHaveAttribute('accept', '.xlsx,.csv')
    const berkas = new File(['NIK;Nama'], 'data.csv', { type: 'text/csv' })
    await userEvent.upload(masukan, berkas)
    expect(onPilih).toHaveBeenCalledWith(berkas)
  })
  it('jenis atau ukuran yang salah ditolak dengan pesan', async () => {
    const { onPilih, masukan } = pasang()
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(masukan, new File(['x'], 'foto.png', { type: 'image/png' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pilih berkas .xlsx atau .csv')
    await user.upload(masukan, new File([new Uint8Array(1024 * 1024 + 1)], 'besar.csv', { type: 'text/csv' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ukuran berkas maksimal 1 MB')
    expect(onPilih).not.toHaveBeenCalled()
  })
})
