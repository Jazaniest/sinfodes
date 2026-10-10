import { describe, expect, it } from 'vitest'
import { HALAMAN_CARI } from './halaman'

describe('halaman di Ctrl+K (SPEC §5.4)', () => {
  it('Permohonan surat untuk peran yang boleh melihat surat', () =>
    expect(HALAMAN_CARI).toContainEqual({ label: 'Permohonan surat', keterangan: 'Layanan Surat', href: '/admin/surat', kemampuan: 'surat.lihat' }))
  it('aksi Buat surat untuk petugas loket; Tanda tangan surat untuk penanda tangan', () => {
    expect(HALAMAN_CARI).toContainEqual({ label: 'Buat surat', keterangan: 'Aksi', href: '/admin/surat/baru', kemampuan: 'surat.proses' })
    expect(HALAMAN_CARI).toContainEqual({
      label: 'Tanda tangan surat', keterangan: 'Layanan Surat', href: '/admin/surat/tanda-tangan', kemampuan: 'surat.tandatangani',
    })
  })
})
