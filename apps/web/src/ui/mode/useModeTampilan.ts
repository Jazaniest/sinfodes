import { useCallback, useEffect, useState } from 'react'
import { bacaMode, KUERI_GELAP, simpanMode, terapkanMode, type ModeTampilan } from './mode'

/**
 * Dipakai kerangka panel desa, dasbor kabupaten, dan Konsol saja. Menerapkan mode saat kerangka dipasang, mengikuti perangkat
 * bila dipilih (tanpa muat ulang), dan melepas atributnya saat kerangka dilepas, sehingga website publik dan layanan warga di
 * alamat yang sama tetap terang.
 */
export function useModeTampilan(): readonly [ModeTampilan, (mode: ModeTampilan) => void] {
  const [mode, setModeState] = useState<ModeTampilan>(bacaMode)
  useEffect(() => {
    const kueri = typeof window.matchMedia === 'function' ? window.matchMedia(KUERI_GELAP) : null
    const terap = () => terapkanMode(mode, kueri?.matches ?? false)
    terap()
    if (mode !== 'perangkat' || !kueri) return
    kueri.addEventListener('change', terap)
    return () => kueri.removeEventListener('change', terap)
  }, [mode])
  useEffect(() => () => document.documentElement.removeAttribute('data-mode'), [])
  const setMode = useCallback((baru: ModeTampilan) => {
    simpanMode(baru)
    setModeState(baru)
  }, [])
  return [mode, setMode]
}
