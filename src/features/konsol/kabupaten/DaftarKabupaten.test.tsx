import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { DaftarKabupaten } from './DaftarKabupaten'

pakaiApiTiruan()

describe('Kabupaten mitra di Konsol (SPEC-V0.2 §7)', () => {
  it('tabel Pelalawan dan Siak: portal, Admin, desa bergabung, tanggal bergabung; baris membuka detail', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const onBuka = vi.fn()
    renderKonsol(<DaftarKabupaten onBuka={onBuka} />)
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Kabupaten' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tambah kabupaten' })).toHaveAttribute('href', '/konsol/kabupaten/baru')
    const tabel = await screen.findByRole('grid', { name: 'Kabupaten mitra' })
    expect(await screen.findByText('2 kabupaten mitra')).toBeInTheDocument()
    const [, pelalawan, siak] = within(tabel).getAllByRole('row')
    expect(pelalawan).toHaveTextContent('Pelalawan')
    expect(pelalawan).toHaveTextContent('Fajar Ramadhan')
    expect(pelalawan).toHaveTextContent('25')
    expect(pelalawan).toHaveTextContent('2 Mar 2026')
    expect(within(pelalawan).getByRole('link', { name: 'kab-pelalawan.sinfodes.localhost' })).toHaveAttribute(
      'href', 'http://kab-pelalawan.sinfodes.localhost:3000/',
    )
    expect(siak).toHaveTextContent('Wahyu Saputra')
    await user.click(siak)
    expect(onBuka).toHaveBeenCalledWith('14.08')
  })
})
