// Membuat versi logo tanpa latar putih untuk UI dan favicon.
// Sumber: src/assets/brand/sinfodes.svg (hasil tracing otomatis; lihat SPEC §16).
import { readFileSync, writeFileSync } from 'node:fs'

const sumber = readFileSync('src/assets/brand/sinfodes.svg', 'utf8')
const kecerahan = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}
const hasil = sumber
  .replace(/<path d="[^"]*" fill="(#[0-9A-Fa-f]{6})"[^>]*\/>\s*/g, (cocok, warna) =>
    kecerahan(warna) > 0.86 ? '' : cocok,
  )
  .replace(/<svg ([^>]*)width="454" height="454">/, '<svg $1viewBox="40 0 380 454">')
writeFileSync('src/assets/brand/sinfodes-mark.svg', hasil)
writeFileSync('public/favicon.svg', hasil)
console.log('Selesai: src/assets/brand/sinfodes-mark.svg dan public/favicon.svg')
