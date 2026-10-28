import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useKunciKirim } from './kunci-kirim'

const POLA_KUNCI = /^[A-Za-z0-9_-]{8,64}$/

describe('useKunciKirim', () => {
  it('isian yang sama dikirim ulang memakai kunci yang sama; isian yang berubah mendapat kunci baru', () => {
    const { result } = renderHook(() => useKunciKirim())
    const a = result.current({ nama: 'Aisyah', berat: 3100 })
    expect(a).toMatch(POLA_KUNCI)
    expect(result.current({ nama: 'Aisyah', berat: 3100 })).toBe(a)
    const b = result.current({ nama: 'Aisyah', berat: 3200 })
    expect(b).not.toBe(a)
    expect(b).toMatch(POLA_KUNCI)
    expect(result.current({ nama: 'Aisyah', berat: 3200 })).toBe(b)
  })

  it('kunci bertahan antar-render dan tidak dibagi antar-formulir', () => {
    const satu = renderHook(() => useKunciKirim())
    const dua = renderHook(() => useKunciKirim())
    const k = satu.result.current({ x: 1 })
    satu.rerender()
    expect(satu.result.current({ x: 1 })).toBe(k)
    expect(dua.result.current({ x: 1 })).not.toBe(k)
  })
})
