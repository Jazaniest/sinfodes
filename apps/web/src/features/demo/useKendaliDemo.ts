import { useEffect, useState } from 'react'

type Kendali = typeof import('@/mocks/kendali')
let muatan: Promise<Kendali> | null = null

/** Memuat kendali demo sekali saja. Hanya dipanggil saat VITE_DEMO=true. */
export function muatKendali(): Promise<Kendali> {
  muatan ??= import('@/mocks/kendali')
  return muatan
}

export function useKendaliDemo(): Kendali | null {
  const [kendali, setKendali] = useState<Kendali | null>(null)
  useEffect(() => {
    if (import.meta.env.VITE_DEMO !== 'true') return
    let aktif = true
    void muatKendali().then((m) => {
      if (aktif) setKendali(m)
    })
    return () => {
      aktif = false
    }
  }, [])
  return kendali
}
