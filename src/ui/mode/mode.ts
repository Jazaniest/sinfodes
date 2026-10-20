/** Mode tampilan pribadi (SPEC-V0.2 §11.2): Terang (bawaan), Gelap, atau Ikuti perangkat. */
export type ModeTampilan = 'terang' | 'gelap' | 'perangkat'

export const MODE_TAMPILAN: readonly ModeTampilan[] = ['terang', 'gelap', 'perangkat']
export const LABEL_MODE: Readonly<Record<ModeTampilan, string>> = { terang: 'Terang', gelap: 'Gelap', perangkat: 'Ikuti perangkat' }

/** Satu perangkat satu pilihan; setiap alamat punya penyimpanannya sendiri. */
export const KUNCI_MODE = 'sinfodes.mode'
export const KUERI_GELAP = '(prefers-color-scheme: dark)'

const sah = (nilai: unknown): nilai is ModeTampilan => MODE_TAMPILAN.includes(nilai as ModeTampilan)

/** Pilihan sesi ini, hanya terisi bila penulisan ke penyimpanan gagal (mis. mode privat): pilihan tetap berlaku selama sesi. */
let cadangan: ModeTampilan | null = null

/** Mode tersimpan; Terang bila belum ada, nilainya asing, atau penyimpanan tidak bisa dibaca. */
export function bacaMode(): ModeTampilan {
  try {
    const nilai = localStorage.getItem(KUNCI_MODE)
    if (sah(nilai)) return nilai
    return nilai === null ? (cadangan ?? 'terang') : 'terang'
  } catch {
    return cadangan ?? 'terang'
  }
}

export function simpanMode(mode: ModeTampilan): void {
  try {
    localStorage.setItem(KUNCI_MODE, mode)
    cadangan = null
  } catch {
    cadangan = mode
  }
}

/** Pasang atau lepas `data-mode="gelap"` di <html>. `gelapPerangkat` dipakai hanya untuk mode `perangkat`. */
export function terapkanMode(mode: ModeTampilan, gelapPerangkat: boolean): void {
  const gelap = mode === 'gelap' || (mode === 'perangkat' && gelapPerangkat)
  const akar = document.documentElement
  if (gelap) akar.setAttribute('data-mode', 'gelap')
  else akar.removeAttribute('data-mode')
}
