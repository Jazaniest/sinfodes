import { ambilDb, ubahDb } from './db'
import { tagihanJatuh, terapkanTagihanBaru } from './tagihan-hitung'

export { buatTagihan, kwitansiTagihan, nomorDesa, nomorKwitansiBerikut, pilihKodeUnik, tagihanBerjalan, tagihanJatuh } from './tagihan-hitung'

/**
 * Terbitkan tagihan yang sudah waktunya (H-14 sebelum periode mulai) dan perpanjang masa aktif langganan: `sampai` = akhir
 * periode tagihan terakhir yang tidak dibatalkan. Menulis hanya bila ada tagihan baru, jadi `GET` biasa tidak menulis.
 */
export function pastikanTagihan(sekarang: Date): void {
  const baru = tagihanJatuh(ambilDb(), sekarang)
  if (baru.length > 0) ubahDb((d) => terapkanTagihanBaru(d, baru))
}
