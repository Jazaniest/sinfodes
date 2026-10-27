import { describe, expect, it } from 'vitest'
import { galatBerkasBukti, jenisBerkasBukti, MAKS_BUKTI_BAIT } from './schema'

describe('berkas bukti transfer', () => {
  it('gambar PNG, JPG, WebP dan PDF dikenali dari tipe maupun ekstensi', () => {
    expect(jenisBerkasBukti({ name: 'a.png', type: 'image/png' })).toBe('gambar')
    expect(jenisBerkasBukti({ name: 'a.JPG', type: '' })).toBe('gambar')
    expect(jenisBerkasBukti({ name: 'a.webp', type: '' })).toBe('gambar')
    expect(jenisBerkasBukti({ name: 'a.pdf', type: 'application/pdf' })).toBe('pdf')
    expect(jenisBerkasBukti({ name: 'a.PDF', type: '' })).toBe('pdf')
  })
  it('PDF tanpa ekstensi tetapi bertipe application/pdf diterima', () => {
    expect(jenisBerkasBukti({ name: 'bukti-transfer', type: 'application/pdf' })).toBe('pdf')
  })
  it('.docx, .xlsx, dan berkas tanpa tipe maupun ekstensi ditolak', () => {
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    expect(jenisBerkasBukti({ name: 'a.docx', type: docx })).toBeNull()
    expect(jenisBerkasBukti({ name: 'a.docx', type: '' })).toBeNull()
    expect(jenisBerkasBukti({ name: 'a.xlsx', type: '' })).toBeNull()
    expect(jenisBerkasBukti({ name: 'bukti', type: '' })).toBeNull()
  })
  it('tepat 2 MB sah, 2 MB + 1 bait ditolak, jenis diperiksa sebelum ukuran', () => {
    expect(galatBerkasBukti({ name: 'a.png', type: 'image/png', size: MAKS_BUKTI_BAIT })).toBeNull()
    expect(galatBerkasBukti({ name: 'a.png', type: 'image/png', size: MAKS_BUKTI_BAIT + 1 })).toBe('Ukuran bukti maksimal 2 MB.')
    expect(galatBerkasBukti({ name: 'a.docx', type: '', size: MAKS_BUKTI_BAIT + 1 })).toBe('Bukti harus gambar (PNG, JPG, WebP) atau PDF.')
  })
})
