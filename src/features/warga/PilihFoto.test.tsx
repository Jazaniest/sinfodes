import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { FotoTerpilih } from './foto'
import { PilihFoto } from './PilihFoto'

function Terkendali({ kecilkan }: { kecilkan: (berkas: File) => Promise<File> }) {
  const [foto, setFoto] = useState<FotoTerpilih | null>(null)
  return <PilihFoto label="KTP" wajib foto={foto} onUbah={setFoto} kecilkan={kecilkan} />
}

function pasang(kecilkan: (berkas: File) => Promise<File>) {
  const { container } = render(<Terkendali kecilkan={kecilkan} />)
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('Input berkas tidak ada')
  return { input, user: userEvent.setup({ applyAccept: false }) }
}

const fotoAsli = (nama: string, kb: number, type = 'image/png') => new File([new Uint8Array(kb * 1024)], nama, { type })

describe('PilihFoto (SPEC §10)', () => {
  it('foto dikecilkan, lalu tampil nama dan ukurannya; Hapus mengosongkan lagi', async () => {
    const kecilkan = vi.fn(async () => new File([new Uint8Array(200 * 1024)], 'ktp.jpg', { type: 'image/jpeg' }))
    const { input, user } = pasang(kecilkan)
    await user.upload(input, fotoAsli('ktp.png', 3000))
    expect(await screen.findByText('ktp.jpg')).toBeInTheDocument()
    expect(screen.getByText('200 KB (asli 3.000 KB)')).toBeInTheDocument()
    expect(kecilkan).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Hapus foto KTP' }))
    expect(screen.getByRole('button', { name: 'Ambil atau pilih foto' })).toBeInTheDocument()
  })
  it('berkas bukan gambar ditolak tanpa diproses (fokus review 2)', async () => {
    const kecilkan = vi.fn(async (f: File) => f)
    const { input, user } = pasang(kecilkan)
    await user.upload(input, fotoAsli('ktp.pdf', 100, 'application/pdf'))
    expect(screen.getByRole('alert')).toHaveTextContent('Pilih berkas foto (JPG, PNG, atau HEIC dari kamera).')
    expect(kecilkan).not.toHaveBeenCalled()
  })
  it('foto yang gagal diproses menampilkan pesan, dan tombol pilih tetap bisa dipakai (fokus review 2)', async () => {
    const kecilkan = vi.fn(async () => {
      throw new Error('Foto tidak bisa diproses')
    })
    const { input, user } = pasang(kecilkan)
    await user.upload(input, fotoAsli('ktp.heic', 2000, 'image/heic'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Foto ini tidak bisa diproses. Coba foto lain, atau ambil ulang dengan kamera.')
    expect(screen.getByRole('button', { name: 'Ambil atau pilih foto' })).toBeEnabled()
  })
})
