/** Luminans relatif WCAG 2.x dari warna #RRGGBB. */
export function luminans(hex: string): number {
  const cocok = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!cocok) throw new Error(`Warna tidak valid: ${hex}`)
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(cocok[1].slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rasio kontras WCAG antara dua warna (1–21). */
export function rasioKontras(a: string, b: string): number {
  const [terang, gelap] = [luminans(a), luminans(b)].sort((x, y) => y - x)
  return (terang + 0.05) / (gelap + 0.05)
}
