import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SkenarioDemo } from './SkenarioDemo'

describe('daftar skenario di halaman demo (SPEC §3.6)', () => {
  it('tiga skenario dengan langkah bernomor; tombol meneruskan akun dan tujuannya', async () => {
    const onJalankan = vi.fn()
    render(<SkenarioDemo onJalankan={onJalankan} sedang={null} />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      '1. SKTM dari HP sampai verifikasi QR',
      '2. Mencatat kelahiran',
      '3. Pemantauan kabupaten',
    ])
    const sktm = screen.getByRole('list', { name: 'Langkah SKTM dari HP sampai verifikasi QR' })
    expect(within(sktm).getAllByRole('listitem')).toHaveLength(5)
    await userEvent.setup().click(within(sktm).getByRole('button', { name: 'Kades: tanda tangan' }))
    expect(onJalankan).toHaveBeenCalledWith(
      expect.objectContaining({ masuk: { bagian: 'admin', peran: 'kades' }, ke: '/admin/surat/tanda-tangan' }),
      expect.any(String),
    )
  })
})
