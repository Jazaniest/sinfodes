import { tanggalIsoWib } from '@/domain/format/tanggal'
import { geserBulan } from '@/domain/indeks/periode'
import { ambilDb, ubahDb } from './db'
import { bulanAwalIndeks } from './indeks-dasar'
import { barisBeku, bekukanPanel, punyaRekaman } from './indeks-panel'

// Perhitungan murni ada di `indeks-hitung` supaya generator bisa memakainya tanpa melingkar lewat `db`.
export * from './indeks-hitung'

/** Membekukan bulan yang baru tutup. Menulis hanya bila ada yang perlu dibekukan, jadi `GET` biasa tidak menulis. */
export function bekukanBulanTutup(sekarang: Date): void {
  const db = ambilDb()
  const terakhirTutup = geserBulan(tanggalIsoWib(sekarang).slice(0, 7), -1)
  const perlu = db.desa.some((d) => {
    if (punyaRekaman(db, d)) return false
    for (let b = bulanAwalIndeks(sekarang); b <= terakhirTutup; b = geserBulan(b, 1)) if (!barisBeku(db, d.id, b)) return true
    return false
  })
  if (perlu) ubahDb((d) => void bekukanPanel(d, sekarang))
}
