import { useState } from 'react'

const AWALAN = 'sinfodes.kolom.'

function baca(kunci: string, bawaan: readonly string[]): ReadonlySet<string> {
  try {
    const tersimpan: unknown = JSON.parse(localStorage.getItem(AWALAN + kunci) ?? 'null')
    if (Array.isArray(tersimpan) && tersimpan.every((x) => typeof x === 'string')) return new Set(tersimpan)
  } catch {
    // Penyimpanan tidak tersedia atau rusak: pakai bawaan.
  }
  return new Set(bawaan)
}

/** Kolom yang ditampilkan per tabel; pilihan diingat di perangkat ini (SPEC §6.2 "Atur kolom"). */
export function useKolomTampil(kunci: string, bawaan: readonly string[]): [ReadonlySet<string>, (id: string, tampil: boolean) => void] {
  const [tampil, setTampil] = useState(() => baca(kunci, bawaan))
  const ubah = (id: string, nilai: boolean) => {
    const baru = new Set(tampil)
    if (nilai) baru.add(id)
    else baru.delete(id)
    setTampil(baru)
    try {
      localStorage.setItem(AWALAN + kunci, JSON.stringify([...baru]))
    } catch {
      // Diabaikan: pilihan berlaku sampai halaman ditutup.
    }
  }
  return [tampil, ubah]
}
