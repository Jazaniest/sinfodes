const WIB_MS = 7 * 3_600_000

/** Sapaan di Beranda menurut jam WIB. */
export function sapaanWaktu(sekarang: Date): string {
  const jam = new Date(sekarang.getTime() + WIB_MS).getUTCHours()
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}
