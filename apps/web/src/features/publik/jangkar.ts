import { useEffect } from 'react'

/**
 * Gulir ke elemen `#jangkar` di alamat halaman sesudah isinya dimuat. Navigasi berjangkar (mis. Jadwal posyandu di
 * Beranda → Layanan#posyandu) terjadi sebelum data halaman tersedia, sehingga router belum menemukan elemennya.
 */
export function useGulirKeJangkar(siap: boolean): void {
  useEffect(() => {
    if (!siap || !window.location.hash) return
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
  }, [siap])
}
