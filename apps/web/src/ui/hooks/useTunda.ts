import { useEffect, useState } from 'react'

/** Nilai yang baru dipakai setelah tidak berubah selama `ms` (mis. kotak cari). */
export function useTunda<T>(nilai: T, ms = 250): T {
  const [tertunda, setTertunda] = useState(nilai)
  useEffect(() => {
    const penghitung = setTimeout(() => setTertunda(nilai), ms)
    return () => clearTimeout(penghitung)
  }, [nilai, ms])
  return tertunda
}
