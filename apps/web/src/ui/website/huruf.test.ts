import { afterEach, describe, expect, it, vi } from 'vitest'

const dimuat = vi.hoisted(() => [] as string[])
vi.mock('@fontsource/fraunces/latin-600.css', () => {
  dimuat.push('fraunces-600')
  return {}
})
vi.mock('@fontsource/work-sans/latin-400.css', () => {
  dimuat.push('work-sans-400')
  return {}
})
vi.mock('@fontsource/work-sans/latin-600.css', () => {
  dimuat.push('work-sans-600')
  return {}
})
vi.mock('@fontsource/bitter/latin-600.css', () => {
  throw new Error('jaringan putus')
})

describe('pemuat huruf website (rencana 7E-1 Tugas 3)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Plex langsung selesai tanpa memuat apa pun; Fraunces memuat judul dan isinya', async () => {
    const { muatPasanganHuruf } = await import('./huruf')
    await muatPasanganHuruf('plex')
    expect(dimuat).toEqual([])
    await muatPasanganHuruf('fraunces')
    expect([...dimuat].sort()).toEqual(['fraunces-600', 'work-sans-400', 'work-sans-600'])
  })
  it('pasangan yang sama dimuat sekali saja', async () => {
    const { muatPasanganHuruf } = await import('./huruf')
    await muatPasanganHuruf('fraunces')
    await muatPasanganHuruf('fraunces')
    expect(dimuat.filter((x) => x === 'fraunces-600')).toHaveLength(1)
  })
  it('galat import ditelan, dicatat sekali, dan tidak melempar (fokus review 3)', async () => {
    const peringatan = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { muatPasanganHuruf } = await import('./huruf')
    await expect(muatPasanganHuruf('bitter')).resolves.toBeUndefined()
    await expect(muatPasanganHuruf('bitter')).resolves.toBeUndefined()
    expect(peringatan).toHaveBeenCalledTimes(1)
  })
})
