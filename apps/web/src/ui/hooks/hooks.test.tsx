import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { aturLebarLayar } from '@/test/layar'
import { useMediaQuery } from './useMediaQuery'
import { useTunda } from './useTunda'

describe('useMediaQuery', () => {
  it('membaca lebar layar', () => {
    expect(renderHook(() => useMediaQuery('(min-width: 1024px)')).result.current).toBe(true)
    expect(renderHook(() => useMediaQuery('(max-width: 639px)')).result.current).toBe(false)
  })
  it('layar HP', () => {
    aturLebarLayar(390)
    expect(renderHook(() => useMediaQuery('(max-width: 639px)')).result.current).toBe(true)
  })
})

describe('useTunda', () => {
  it('nilai baru dipakai setelah jeda', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ nilai }) => useTunda(nilai, 250), { initialProps: { nilai: 'si' } })
    rerender({ nilai: 'siti' })
    expect(result.current).toBe('si')
    act(() => vi.advanceTimersByTime(250))
    expect(result.current).toBe('siti')
    vi.useRealTimers()
  })
})
