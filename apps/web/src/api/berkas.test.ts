import { afterEach, describe, expect, it, vi } from 'vitest'
import { bisaBukaBerkas, urlBerkasLampiran, urlBerkasScan } from './berkas'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('alamat berkas di server nyata (rencana 8F3 Tugas 10)', () => {
  it('alamat lampiran dan pindaian memakai basis API dan hanya memuat id (tanpa NIK atau nama berkas)', () => {
    expect(urlBerkasLampiran('srt_abc', 'lmp_xyz')).toBe('/api/v1/permohonan/srt_abc/lampiran/lmp_xyz')
    expect(urlBerkasScan('sm_123')).toBe('/api/v1/surat-masuk/sm_123/scan')
  })

  it('id disandikan untuk URL', () => {
    expect(urlBerkasLampiran('srt a/b', 'lmp?x')).toBe('/api/v1/permohonan/srt%20a%2Fb/lampiran/lmp%3Fx')
  })

  it('berkas hanya bisa dibuka di mode nyata: demo tidak menyimpan isi berkas', () => {
    vi.stubEnv('VITE_DEMO', 'true')
    expect(bisaBukaBerkas()).toBe(false)
    vi.stubEnv('VITE_DEMO', 'false')
    expect(bisaBukaBerkas()).toBe(true)
  })
})
