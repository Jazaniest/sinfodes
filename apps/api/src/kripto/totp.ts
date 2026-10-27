import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * TOTP (RFC 6238) dengan SHA-1, 6 digit, langkah 30 detik, ditulis sendiri di atas HOTP (RFC 4226) tanpa pustaka
 * (SPEC-V0.3 §8.4). SHA-1 dipilih karena itulah yang dikenal semua aplikasi autentikator; kekuatannya ada pada rahasia 20 bita
 * dan pada batas percobaan masuk, bukan pada fungsi hash.
 */
export const DETIK_LANGKAH = 30
const ALFABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export const langkahDari = (waktu: Date): number => Math.floor(waktu.getTime() / 1000 / DETIK_LANGKAH)

export const buatRahasiaTotp = (): Buffer => randomBytes(20)

/** Kode enam digit untuk satu langkah waktu (pemotongan dinamis RFC 4226). */
export function kodeTotp(rahasia: Buffer, langkah: number): string {
  const penghitung = Buffer.alloc(8)
  penghitung.writeBigUInt64BE(BigInt(langkah))
  const hmac = createHmac('sha1', rahasia).update(penghitung).digest()
  const geser = hmac[19] & 0x0f
  const biner = ((hmac[geser] & 0x7f) << 24) | (hmac[geser + 1] << 16) | (hmac[geser + 2] << 8) | hmac[geser + 3]
  return String(biner % 1_000_000).padStart(6, '0')
}

/**
 * Memeriksa kode terhadap langkah sekarang dan satu langkah di kiri dan kanannya (selisih jam wajar). Kode yang langkahnya
 * tidak lebih baru daripada `langkahTerakhir` ditolak, jadi kode yang sudah dipakai tidak bisa dipakai lagi. Ketiga langkah
 * selalu dihitung dan dibandingkan dengan waktu tetap.
 */
export function periksaTotp(rahasia: Buffer, kode: string, sekarang: Date, langkahTerakhir: number | null): { sah: boolean; langkah: number } {
  const dasar = langkahDari(sekarang)
  if (!/^\d{6}$/.test(kode)) return { sah: false, langkah: dasar }
  const masukan = Buffer.from(kode)
  let cocok: number | null = null
  for (const geser of [-1, 0, 1]) {
    const langkah = dasar + geser
    if (timingSafeEqual(Buffer.from(kodeTotp(rahasia, langkah)), masukan)) cocok = langkah
  }
  if (cocok === null) return { sah: false, langkah: dasar }
  return { sah: langkahTerakhir === null || cocok > langkahTerakhir, langkah: cocok }
}

/** Base32 RFC 4648 tanpa padding, bentuk yang diminta aplikasi autentikator saat kunci diketik manual. */
export function keBase32(data: Buffer): string {
  let bit = 0
  let nilai = 0
  let hasil = ''
  for (const bita of data) {
    nilai = (nilai << 8) | bita
    bit += 8
    while (bit >= 5) {
      hasil += ALFABET_BASE32[(nilai >>> (bit - 5)) & 31]
      bit -= 5
    }
  }
  if (bit > 0) hasil += ALFABET_BASE32[(nilai << (5 - bit)) & 31]
  return hasil
}

export function urlOtpauth(rahasia: Buffer, email: string, penerbit: string): string {
  const label = `${encodeURIComponent(penerbit)}:${encodeURIComponent(email)}`
  const query = new URLSearchParams({ secret: keBase32(rahasia), issuer: penerbit, algorithm: 'SHA1', digits: '6', period: String(DETIK_LANGKAH) })
  return `otpauth://totp/${label}?${query.toString()}`
}
