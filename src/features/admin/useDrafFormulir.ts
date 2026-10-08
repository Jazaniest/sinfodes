import { useCallback, useEffect, useRef, useState } from 'react'
import { waktuIsoWib } from '@/domain/format/tanggal'

const AWALAN = 'sinfodes.draf.'
const JEDA_MS = 500

export type Draf<T> = { disimpanPada: string; isi: T }

/** Draf tersimpan, atau null bila tidak ada, rusak, atau bentuknya tidak cocok (fokus review 5). */
export function bacaDraf<T>(kunci: string, cocok: (isi: unknown) => isi is T): Draf<T> | null {
  try {
    const mentah = localStorage.getItem(AWALAN + kunci)
    if (!mentah) return null
    const data: unknown = JSON.parse(mentah)
    if (typeof data !== 'object' || data === null) return null
    const { versi, disimpanPada, isi } = data as Record<string, unknown>
    return versi === 1 && typeof disimpanPada === 'string' && cocok(isi) ? { disimpanPada, isi } : null
  } catch {
    return null
  }
}

/** Hapus semua draf formulir di perangkat ini. Dipanggil saat keluar, karena draf bisa berisi NIK. */
export function hapusSemuaDraf(): void {
  try {
    const kunci = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
      (k): k is string => k !== null && k.startsWith(AWALAN),
    )
    for (const k of kunci) localStorage.removeItem(k)
  } catch {
    // Penyimpanan tidak tersedia: tidak ada draf yang perlu dihapus.
  }
}

/**
 * Draf otomatis per formulir di localStorage (SPEC §6.4). Draf dibaca sekali saat formulir dibuka.
 * `simpan` ditunda 500 ms supaya ketikan beruntun cukup ditulis sekali; isian terakhir tetap ditulis saat formulir ditutup.
 */
export function useDrafFormulir<T>(kunci: string, cocok: (isi: unknown) => isi is T) {
  const [draf] = useState(() => bacaDraf(kunci, cocok))
  const jadwal = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tertunda = useRef<{ isi: T } | null>(null)

  const tulis = useCallback(
    (isi: T) => {
      try {
        localStorage.setItem(AWALAN + kunci, JSON.stringify({ versi: 1, disimpanPada: waktuIsoWib(new Date()), isi }))
      } catch {
        // Penyimpanan penuh atau diblokir: draf dilewati, formulir tetap berjalan.
      }
    },
    [kunci],
  )

  const simpan = useCallback(
    (isi: T) => {
      tertunda.current = { isi }
      if (jadwal.current) clearTimeout(jadwal.current)
      jadwal.current = setTimeout(() => {
        jadwal.current = null
        tertunda.current = null
        tulis(isi)
      }, JEDA_MS)
    },
    [tulis],
  )

  const buang = useCallback(() => {
    if (jadwal.current) clearTimeout(jadwal.current)
    jadwal.current = null
    tertunda.current = null
    try {
      localStorage.removeItem(AWALAN + kunci)
    } catch {
      // Diabaikan.
    }
  }, [kunci])

  useEffect(
    () => () => {
      if (jadwal.current) clearTimeout(jadwal.current)
      jadwal.current = null
      if (tertunda.current) tulis(tertunda.current.isi)
      tertunda.current = null
    },
    [tulis],
  )

  return { draf, simpan, buang }
}
