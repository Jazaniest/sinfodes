import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SuratMasuk } from '@/domain/surat/arsip'
import { LaciSuratMasuk } from './LaciSuratMasuk'

afterEach(() => {
  vi.unstubAllEnvs()
})

const SURAT: SuratMasuk = {
  id: 'sm_1', desaId: 'desa_sungai_sialang', noAgenda: 7, diterima: '2026-09-23', nomor: '005/123/Kec-TM/2026', tanggalSurat: '2026-09-21',
  pengirim: 'Camat Teluk Meranti', perihal: 'Undangan rapat koordinasi', scan: { berkas: 'surat-masuk-2026-007.pdf', ukuranKb: 412 },
  disposisi: null, dicatat: { oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, pada: '2026-09-23T09:00:00+07:00' },
}

describe('LaciSuratMasuk: pindaian', () => {
  it('mode nyata: nama pindaian disertai tautan Buka ke tab baru beralamat id surat', () => {
    vi.stubEnv('VITE_DEMO', 'false')
    render(<LaciSuratMasuk surat={SURAT} onTutup={() => {}} />)
    const tautan = screen.getByRole('link', { name: 'Buka pindaian' })
    expect(tautan).toHaveAttribute('href', '/api/v1/surat-masuk/sm_1/scan')
    expect(tautan).toHaveAttribute('target', '_blank')
    expect(tautan.getAttribute('rel')).toContain('noopener')
    expect(tautan.getAttribute('rel')).toContain('noreferrer')
    expect(screen.getByText(/surat-masuk-2026-007\.pdf · 412 KB/)).toBeInTheDocument()
  })

  it('mode demo: hanya teks nama dan ukuran', () => {
    vi.stubEnv('VITE_DEMO', 'true')
    render(<LaciSuratMasuk surat={SURAT} onTutup={() => {}} />)
    expect(screen.queryByRole('link', { name: 'Buka pindaian' })).toBeNull()
    expect(screen.getByText('surat-masuk-2026-007.pdf · 412 KB')).toBeInTheDocument()
  })

  it('tanpa pindaian: Tidak ada scan, tanpa tautan', () => {
    vi.stubEnv('VITE_DEMO', 'false')
    render(<LaciSuratMasuk surat={{ ...SURAT, scan: null }} onTutup={() => {}} />)
    expect(screen.getByText('Tidak ada scan')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buka pindaian' })).toBeNull()
  })
})
