import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Permohonan } from '@/domain/surat/permohonan'
import { DaftarLampiran } from './DaftarLampiran'

afterEach(() => {
  vi.unstubAllEnvs()
})

const LAMPIRAN = [
  { id: 'lmp_ktp', syarat: 'KTP', berkas: 'ktp.jpg', ukuranKb: 120 },
  { id: 'lmp_kk', syarat: 'KK', berkas: 'kk.pdf', ukuranKb: 340 },
]
const online = (lampiran = LAMPIRAN): Pick<Permohonan, 'id' | 'kanal' | 'lampiran'> => ({ id: 'srt_1', kanal: 'online', lampiran })

describe('DaftarLampiran', () => {
  it('mode nyata: tiap lampiran punya tautan Buka ke tab baru tanpa referer, beralamat id permohonan dan id lampiran', () => {
    vi.stubEnv('VITE_DEMO', 'false')
    render(<DaftarLampiran p={online()} />)
    const daftar = screen.getByRole('list', { name: 'Lampiran dari warga' })
    const tautan = within(daftar).getAllByRole('link')
    expect(tautan).toHaveLength(2)
    expect(tautan[0]).toHaveAccessibleName('Buka KTP')
    expect(tautan[0]).toHaveAttribute('href', '/api/v1/permohonan/srt_1/lampiran/lmp_ktp')
    expect(tautan[1]).toHaveAttribute('href', '/api/v1/permohonan/srt_1/lampiran/lmp_kk')
    for (const t of tautan) {
      expect(t).toHaveAttribute('target', '_blank')
      expect(t.getAttribute('rel')).toContain('noopener')
      expect(t.getAttribute('rel')).toContain('noreferrer')
      expect(t.getAttribute('href')).not.toMatch(/\d{16}|ktp\.jpg|kk\.pdf/)
    }
  })

  it('mode demo: hanya teks nama dan ukuran, tanpa tautan', () => {
    vi.stubEnv('VITE_DEMO', 'true')
    render(<DaftarLampiran p={online()} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('ktp.jpg · 120 KB')).toBeInTheDocument()
  })

  it('permohonan loket dan tanpa lampiran tetap menampilkan kalimatnya, tanpa tautan', () => {
    vi.stubEnv('VITE_DEMO', 'false')
    const { rerender } = render(<DaftarLampiran p={{ id: 'srt_2', kanal: 'loket', lampiran: [] }} />)
    expect(screen.getByText(/Permohonan loket: berkas persyaratan diperiksa langsung di kantor desa/)).toBeInTheDocument()
    rerender(<DaftarLampiran p={online([])} />)
    expect(screen.getByText('Tidak ada lampiran.')).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
