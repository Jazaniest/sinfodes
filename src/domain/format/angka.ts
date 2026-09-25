const MINUS = '−'

function kelompokRibuan(bulat: string): string {
  return bulat.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** 2812 → "2.812"; (65.4, 1) → "65,4". */
export function formatAngka(nilai: number, desimal = 0): string {
  const [bulat, pecahan] = Math.abs(nilai).toFixed(desimal).split('.')
  return (nilai < 0 ? MINUS : '') + kelompokRibuan(bulat) + (pecahan ? `,${pecahan}` : '')
}

/** 0.654 → "65,4%". */
export function formatPersen(rasio: number, desimal = 1): string {
  return `${formatAngka(rasio * 100, desimal)}%`
}

/** 1250000 → "Rp1.250.000". */
export function formatRupiah(nilai: number): string {
  return `${nilai < 0 ? MINUS : ''}Rp${formatAngka(Math.round(Math.abs(nilai)))}`
}

function ringkas(nilai: number, maksDesimal: number): string {
  let teks = nilai.toFixed(maksDesimal)
  if (teks.includes('.')) teks = teks.replace(/0+$/, '').replace(/\.$/, '')
  const [bulat, pecahan] = teks.split('.')
  return kelompokRibuan(bulat) + (pecahan ? `,${pecahan}` : '')
}

/** "Rp1,83 M", "Rp624,3 jt", "Rp48 rb". Nilai penuh ditampilkan di tooltip oleh komponen. */
export function formatRupiahRingkas(nilai: number): string {
  const tanda = nilai < 0 ? MINUS : ''
  const n = Math.abs(nilai)
  if (n >= 1e9) return `${tanda}Rp${ringkas(n / 1e9, 2)} M`
  if (n >= 1e6) return `${tanda}Rp${ringkas(n / 1e6, 1)} jt`
  if (n >= 1e3) return `${tanda}Rp${ringkas(n / 1e3, 0)} rb`
  return formatRupiah(nilai)
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']

const gabung = (a: string, b: string): string => (b ? `${a} ${b}` : a)

function terbilangBulat(n: number): string {
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${SATUAN[n - 10]} belas`
  if (n < 100) return gabung(`${SATUAN[Math.floor(n / 10)]} puluh`, terbilangBulat(n % 10))
  if (n < 200) return gabung('seratus', terbilangBulat(n - 100))
  if (n < 1000) return gabung(`${SATUAN[Math.floor(n / 100)]} ratus`, terbilangBulat(n % 100))
  if (n < 2000) return gabung('seribu', terbilangBulat(n - 1000))
  if (n < 1e6) return gabung(`${terbilangBulat(Math.floor(n / 1000))} ribu`, terbilangBulat(n % 1000))
  if (n < 1e9) return gabung(`${terbilangBulat(Math.floor(n / 1e6))} juta`, terbilangBulat(n % 1e6))
  if (n < 1e12) return gabung(`${terbilangBulat(Math.floor(n / 1e9))} miliar`, terbilangBulat(n % 1e9))
  return gabung(`${terbilangBulat(Math.floor(n / 1e12))} triliun`, terbilangBulat(n % 1e12))
}

/** 1250000 → "satu juta dua ratus lima puluh ribu". */
export function terbilang(nilai: number): string {
  if (!Number.isSafeInteger(nilai) || nilai < 0) throw new Error('Terbilang hanya untuk bilangan bulat ≥ 0')
  return nilai === 0 ? 'nol' : terbilangBulat(nilai)
}

export function terbilangRupiah(nilai: number): string {
  return `${terbilang(nilai)} rupiah`
}
