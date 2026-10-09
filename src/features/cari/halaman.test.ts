import { describe, expect, it } from 'vitest'
import { HALAMAN_CARI } from './halaman'

describe('halaman di Ctrl+K (SPEC §5.4)', () => {
  it('Permohonan surat untuk peran yang boleh melihat surat', () =>
    expect(HALAMAN_CARI).toContainEqual({ label: 'Permohonan surat', keterangan: 'Layanan Surat', href: '/admin/surat', kemampuan: 'surat.lihat' }))
})
