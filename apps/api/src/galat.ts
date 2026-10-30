import type { KodeGalat } from '@sinfodes/kontrak/api'

/** Galat yang sengaja dilempar kode aplikasi dan aman diteruskan ke klien dalam bentuk kontrak (SPEC-V0.3 §5.1). */
export class GalatApp extends Error {
  readonly kode: KodeGalat
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(kode: KodeGalat, pesan: string, status: number, fields?: Record<string, string>) {
    super(pesan)
    this.name = 'GalatApp'
    this.kode = kode
    this.status = status
    this.fields = fields
  }
}

/**
 * Galat yang keluar sebagai jawaban 4xx tetapi **tidak membatalkan** transaksi permintaan, supaya tulisan pencatat (hitungan
 * percobaan, jejak audit) tetap tersimpan. Pola yang sama dengan "kembalikan, jangan lempar" di `POST /sesi/masuk`, namun bisa
 * dilempar dari lapisan layanan. Aturan pakai: lempar hanya SEBELUM ada tulis domain apa pun selain pencatat percobaan dan
 * jejak audit; sesudah tulis domain, galat biasa (`GalatApp`) yang membatalkan semuanya. `lapisanTransaksi` mengenalinya, dan
 * status 5xx tetap membatalkan.
 */
export class GalatDisimpan extends GalatApp {
  constructor(kode: KodeGalat, pesan: string, status: number, fields?: Record<string, string>) {
    super(kode, pesan, status, fields)
    this.name = 'GalatDisimpan'
  }
}

/** Badan jawaban galat: `{ error: { code, message, fields? } }`. */
export const badanGalat = (kode: KodeGalat, pesan: string, fields?: Record<string, string>) => ({
  error: fields ? { code: kode, message: pesan, fields } : { code: kode, message: pesan },
})

/** Kode galat kontrak untuk status HTTP yang dilempar kerangka (mis. `HTTPException`). */
export function kodeDariStatus(status: number): KodeGalat {
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 400 && status < 500) return 'VALIDATION'
  return 'SERVER'
}
