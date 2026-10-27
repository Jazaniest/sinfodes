import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keOklch } from '@/domain/website/kontras'
import { rasioKontras } from '../kontras'
import { TOKEN_GELAP } from '../tokens'
import { bacaMode, KUNCI_MODE, simpanMode, terapkanMode } from './mode'
import { useModeTampilan } from './useModeTampilan'

type Pendengar = (e: { matches: boolean }) => void

/** matchMedia palsu untuk `(prefers-color-scheme: dark)`; `ubah` memicu event change seperti peramban. */
function pasangMatchMedia(awal: boolean) {
  const pendengar = new Set<Pendengar>()
  const status = { matches: awal }
  const mql = {
    get matches() {
      return status.matches
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, f: Pendengar) => pendengar.add(f),
    removeEventListener: (_: string, f: Pendengar) => pendengar.delete(f),
  }
  vi.stubGlobal('matchMedia', () => mql)
  return {
    pendengar,
    ubah(gelap: boolean) {
      status.matches = gelap
      for (const f of [...pendengar]) f({ matches: gelap })
    },
  }
}
const atribut = () => document.documentElement.getAttribute('data-mode')

beforeEach(() => document.documentElement.removeAttribute('data-mode'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('data-mode')
})

describe('mode tampilan pribadi (rencana 7E-2 Tugas 4)', () => {
  it('nilai tersimpan dibaca kembali; kunci sinfodes.mode; bawaan terang; nilai asing diabaikan', () => {
    expect(KUNCI_MODE).toBe('sinfodes.mode')
    expect(bacaMode()).toBe('terang')
    simpanMode('gelap')
    expect(localStorage.getItem('sinfodes.mode')).toBe('gelap')
    expect(bacaMode()).toBe('gelap')
    simpanMode('perangkat')
    expect(bacaMode()).toBe('perangkat')
    localStorage.setItem('sinfodes.mode', 'ungu')
    expect(bacaMode()).toBe('terang')
  })

  it('localStorage yang melempar: baca → terang, simpan tidak melempar (fokus review 3)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('diblokir', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('diblokir', 'SecurityError')
    })
    expect(bacaMode()).toBe('terang')
    expect(() => simpanMode('gelap')).not.toThrow()
  })

  it('terapkanMode memasang atau melepas data-mode pada <html>', () => {
    terapkanMode('gelap', false)
    expect(atribut()).toBe('gelap')
    terapkanMode('terang', true)
    expect(atribut()).toBeNull()
    terapkanMode('perangkat', true)
    expect(atribut()).toBe('gelap')
    terapkanMode('perangkat', false)
    expect(atribut()).toBeNull()
  })

  it('hook: menerapkan saat dipasang, mengikuti pilihan, dan melepas atribut saat dilepas', () => {
    pasangMatchMedia(false)
    simpanMode('gelap')
    const { result, unmount } = renderHook(() => useModeTampilan())
    expect(result.current[0]).toBe('gelap')
    expect(atribut()).toBe('gelap')
    act(() => result.current[1]('terang'))
    expect(result.current[0]).toBe('terang')
    expect(atribut()).toBeNull()
    expect(localStorage.getItem('sinfodes.mode')).toBe('terang')
    act(() => result.current[1]('gelap'))
    expect(atribut()).toBe('gelap')
    unmount()
    expect(atribut()).toBeNull()
  })

  it('Ikuti perangkat mengikuti matchMedia dan berubah saat event change, tanpa muat ulang (fokus review 2)', () => {
    const mm = pasangMatchMedia(false)
    simpanMode('perangkat')
    const { unmount } = renderHook(() => useModeTampilan())
    expect(atribut()).toBeNull()
    act(() => mm.ubah(true))
    expect(atribut()).toBe('gelap')
    act(() => mm.ubah(false))
    expect(atribut()).toBeNull()
    unmount()
    expect(mm.pendengar.size).toBe(0)
  })

  it('mode Terang atau Gelap tidak berlangganan perubahan perangkat', () => {
    const mm = pasangMatchMedia(true)
    simpanMode('terang')
    const { result } = renderHook(() => useModeTampilan())
    expect(mm.pendengar.size).toBe(0)
    expect(atribut()).toBeNull()
    act(() => result.current[1]('perangkat'))
    expect(mm.pendengar.size).toBe(1)
    expect(atribut()).toBe('gelap')
    act(() => result.current[1]('terang'))
    expect(mm.pendengar.size).toBe(0)
  })

  it('penyimpanan dilarang: pilihan tetap bekerja selama sesi dan tidak melempar (fokus review 3)', () => {
    pasangMatchMedia(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('diblokir', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('diblokir', 'SecurityError')
    })
    const awal = renderHook(() => useModeTampilan())
    expect(awal.result.current[0]).toBe('terang')
    act(() => awal.result.current[1]('gelap'))
    expect(atribut()).toBe('gelap')
    awal.unmount()
    // Kerangka lain di sesi yang sama membaca pilihan yang sama walau penyimpanan tertutup.
    const lain = renderHook(() => useModeTampilan())
    expect(lain.result.current[0]).toBe('gelap')
    expect(atribut()).toBe('gelap')
  })
})

describe('palet gelap Register: batas kontras (rencana 7E-2 keputusan 9)', () => {
  const g = TOKEN_GELAP
  const kontras = (depan: keyof typeof g, latar: keyof typeof g) => rasioKontras(g[depan], g[latar])

  it.each(['kertas', 'kertas-2', 'lembar'] as const)('tinta dan tinta-2 di atas %s ≥ 4,5', (latar) => {
    expect(kontras('tinta', latar)).toBeGreaterThanOrEqual(4.5)
    expect(kontras('tinta-2', latar)).toBeGreaterThanOrEqual(4.5)
  })
  it('tinta-3 dan biru di atas lembar ≥ 4,5', () => {
    expect(kontras('tinta-3', 'lembar')).toBeGreaterThanOrEqual(4.5)
    expect(kontras('biru', 'lembar')).toBeGreaterThanOrEqual(4.5)
  })
  it.each(['biru', 'hijau', 'merah', 'stempel'] as const)('putih (teks di atas warna isi) di atas %s ≥ 4,5', (latar) => {
    expect(kontras('putih', latar)).toBeGreaterThanOrEqual(4.5)
  })
  it('garis-input di atas lembar ≥ 3', () => {
    expect(kontras('garis-input', 'lembar')).toBeGreaterThanOrEqual(3)
  })
  it('hijau, oker, dan merah masing-masing ≥ 3 di atas lembar dan saling berbeda rona (status tetap terbedakan)', () => {
    const status = ['hijau', 'oker', 'merah'] as const
    for (const s of status) expect(kontras(s, 'lembar'), s).toBeGreaterThanOrEqual(3)
    const rona = (hex: string) => keOklch(hex).h
    const selisih = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
    expect(selisih(rona(g.hijau), rona(g.oker))).toBeGreaterThanOrEqual(30)
    expect(selisih(rona(g.oker), rona(g.merah))).toBeGreaterThanOrEqual(30)
    expect(selisih(rona(g.hijau), rona(g.merah))).toBeGreaterThanOrEqual(30)
  })
  it('pasangan lain di atas warna muda sendiri tetap terbaca: oker, stempel, hijau, merah ≥ 4,5 di atas muda', () => {
    expect(kontras('oker', 'oker-muda')).toBeGreaterThanOrEqual(4.5)
    expect(kontras('stempel', 'stempel-muda')).toBeGreaterThanOrEqual(4.5)
    expect(kontras('hijau', 'hijau-muda')).toBeGreaterThanOrEqual(4.5)
    expect(kontras('merah', 'merah-muda')).toBeGreaterThanOrEqual(4.5)
    expect(kontras('biru', 'biru-muda')).toBeGreaterThanOrEqual(4.5)
  })
  it('warna seri grafik ≥ 3 di atas lembar', () => {
    for (const s of ['seri-1', 'seri-2', 'seri-3', 'seri-4', 'seri-5'] as const) expect(kontras(s, 'lembar'), s).toBeGreaterThanOrEqual(3)
  })
  it('kapur (teks di atas tinta) ≥ 4,5 di atas tinta', () => {
    expect(kontras('kapur', 'tinta')).toBeGreaterThanOrEqual(4.5)
  })
})
