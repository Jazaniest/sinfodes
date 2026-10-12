/** PIN layanan warga: 6 angka dari kantor desa (SPEC §10). */
export const POLA_PIN = /^\d{6}$/
/** Nomor HP Indonesia, sama dengan kolom telepon penduduk. */
export const POLA_WHATSAPP = /^08\d{8,11}$/
export const PESAN_PIN = 'PIN terdiri dari 6 angka.'

export function periksaPin(pin: string): string | null {
  return POLA_PIN.test(pin) ? null : PESAN_PIN
}

const URUT_NAIK = '0123456789'
const URUT_TURUN = '9876543210'

/** PIN baru yang mudah ditebak ditolak (fokus review 5). */
export function periksaPinBaru(baru: string, lama: string): string | null {
  const bentuk = periksaPin(baru)
  if (bentuk) return bentuk
  if (baru === lama) return 'PIN baru harus berbeda dari PIN lama.'
  if (/^(\d)\1{5}$/.test(baru)) return 'PIN tidak boleh 6 angka yang sama.'
  if (URUT_NAIK.includes(baru) || URUT_TURUN.includes(baru)) return 'PIN tidak boleh angka berurutan seperti 123456.'
  return null
}

/** "+62 812-7740-2231" → "081277402231". */
export function bersihkanWhatsapp(teks: string): string {
  const digit = teks.replace(/\D/g, '')
  return digit.startsWith('62') ? `0${digit.slice(2)}` : digit
}

export function periksaWhatsapp(nomor: string): string | null {
  return POLA_WHATSAPP.test(nomor) ? null : 'Nomor WhatsApp diawali 08 dan terdiri dari 10–13 angka.'
}

/** "081277402231" → "0812-7740-2231". */
export function formatWhatsapp(nomor: string): string {
  return `${nomor.slice(0, 4)}-${nomor.slice(4, 8)}-${nomor.slice(8)}`
}

/** "1405095203918002" → "•••• •••• •••• 8002" (SPEC §10). */
export function samarkanNik(nik: string): string {
  return `•••• •••• •••• ${nik.slice(-4)}`
}
