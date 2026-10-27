import { useSyncExternalStore } from 'react'

/** true kalau media query cocok; ikut berubah saat layar diubah ukurannya. */
export function useMediaQuery(kueri: string): boolean {
  return useSyncExternalStore(
    (beritahu) => {
      const mql = window.matchMedia(kueri)
      mql.addEventListener('change', beritahu)
      return () => mql.removeEventListener('change', beritahu)
    },
    () => window.matchMedia(kueri).matches,
    () => false,
  )
}
