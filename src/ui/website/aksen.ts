const keRgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Campuran sRGB: `porsi` bagian warna `ke`, sisanya warna `dari`. */
function campur(dari: string, ke: string, porsi: number): string {
  const a = keRgb(dari)
  const b = keRgb(ke)
  const kanal = a.map((x, i) => Math.round(x + (b[i] - x) * porsi).toString(16).padStart(2, '0'))
  return `#${kanal.join('')}`.toUpperCase()
}

/** Turunan aksen website (SPEC §9): versi gelap untuk hover dan versi pucat untuk latar sorotan. */
export function turunanAksen(hex: string): { utama: string; tua: string; muda: string } {
  return { utama: hex.toUpperCase(), tua: campur(hex, '#000000', 0.2), muda: campur(hex, '#FFFFFF', 0.9) }
}

/**
 * Variabel CSS untuk kerangka website: token biru Register ditimpa aksen desa, sehingga tautan, tombol, dan cincin
 * fokus memakai warna desa tanpa komponen baru.
 */
export function gayaAksen(hex: string): Record<string, string> {
  const t = turunanAksen(hex)
  return { '--color-biru': t.utama, '--color-biru-tua': t.tua, '--color-biru-muda': t.muda }
}
