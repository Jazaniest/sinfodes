export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const
export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

const WIB_MS = 7 * 3_600_000
const HARI_MS = 86_400_000

export type GayaTanggal = 'panjang' | 'pendek' | 'hari'

/**
 * "YYYY-MM-DD" dibaca sebagai tanggal kalender. Tanggal-waktu berzona diubah ke WIB.
 * Hasilnya Date yang field UTC-nya berisi waktu dinding WIB.
 */
export function keWaktuWib(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [t, b, h] = iso.split('-').map(Number)
    return new Date(Date.UTC(t, b - 1, h))
  }
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new Error(`Tanggal tidak valid: ${iso}`)
  return new Date(ms + WIB_MS)
}

export function formatTanggal(iso: string, gaya: GayaTanggal = 'panjang'): string {
  const w = keWaktuWib(iso)
  const tgl = w.getUTCDate()
  const tahun = w.getUTCFullYear()
  if (gaya === 'pendek') return `${tgl} ${BULAN_PENDEK[w.getUTCMonth()]} ${tahun}`
  const panjang = `${tgl} ${BULAN[w.getUTCMonth()]} ${tahun}`
  return gaya === 'hari' ? `${HARI[w.getUTCDay()]}, ${panjang}` : panjang
}

export function formatJam(iso: string): string {
  const w = keWaktuWib(iso)
  return `${String(w.getUTCHours()).padStart(2, '0')}.${String(w.getUTCMinutes()).padStart(2, '0')}`
}

/** Untuk tanggal-waktu: "09.12" (hari ini), "Kemarin", "21 Sep" (tahun sama), "21 Sep 2025". */
export function formatWaktuRelatif(iso: string, sekarang: Date): string {
  const w = keWaktuWib(iso)
  const s = new Date(sekarang.getTime() + WIB_MS)
  const selisih = Math.floor(s.getTime() / HARI_MS) - Math.floor(w.getTime() / HARI_MS)
  if (selisih === 0) return formatJam(iso)
  if (selisih === 1) return 'Kemarin'
  const tglBulan = `${w.getUTCDate()} ${BULAN_PENDEK[w.getUTCMonth()]}`
  return w.getUTCFullYear() === s.getUTCFullYear() ? tglBulan : `${tglBulan} ${w.getUTCFullYear()}`
}

export function tanggalIsoWib(waktu: Date): string {
  return new Date(waktu.getTime() + WIB_MS).toISOString().slice(0, 10)
}

export function waktuIsoWib(waktu: Date): string {
  return `${new Date(waktu.getTime() + WIB_MS).toISOString().slice(0, 19)}+07:00`
}

export function hitungUmur(tanggalLahir: string, pada: Date): { tahun: number; bulan: number } {
  const lahir = keWaktuWib(tanggalLahir)
  const kini = new Date(pada.getTime() + WIB_MS)
  let bulan =
    (kini.getUTCFullYear() - lahir.getUTCFullYear()) * 12 + (kini.getUTCMonth() - lahir.getUTCMonth())
  if (kini.getUTCDate() < lahir.getUTCDate()) bulan -= 1
  bulan = Math.max(0, bulan)
  return { tahun: Math.floor(bulan / 12), bulan }
}

export function formatUmur(tanggalLahir: string, pada: Date): string {
  const { tahun, bulan } = hitungUmur(tanggalLahir, pada)
  if (tahun >= 1) return `${tahun} tahun`
  return bulan === 0 ? 'kurang dari 1 bulan' : `${bulan} bulan`
}

/** Meta kepala halaman: "hari ini 08.15", "kemarin", atau "21 Sep" (SPEC §6.2). */
export function formatDiperbarui(iso: string, sekarang: Date): string {
  const relatif = formatWaktuRelatif(iso, sekarang)
  if (/^\d{2}\.\d{2}$/.test(relatif)) return `hari ini ${relatif}`
  return relatif === 'Kemarin' ? 'kemarin' : relatif
}

/** "2026-09" → "September 2026". */
export function formatBulan(bulan: string): string {
  const [tahun, b] = bulan.split('-').map(Number)
  return `${BULAN[b - 1]} ${tahun}`
}

/** `jumlah` bulan terakhir ("YYYY-MM"), dimulai dari bulan berjalan menurut WIB. */
export function daftarBulanTerakhir(sekarang: Date, jumlah: number): string[] {
  const [tahun, bulan] = tanggalIsoWib(sekarang).split('-').map(Number)
  return Array.from({ length: jumlah }, (_, i) => {
    const urutan = tahun * 12 + (bulan - 1) - i
    return `${Math.floor(urutan / 12)}-${String((urutan % 12) + 1).padStart(2, '0')}`
  })
}

/** Waktu catatan riwayat: "24 Sep 2026 · pukul 09.12 WIB" (SPEC §4.5). */
export function formatWaktuLog(iso: string): string {
  return `${formatTanggal(iso, 'pendek')} · pukul ${formatJam(iso)} WIB`
}
