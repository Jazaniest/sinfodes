import type { KodeGalat } from '@/domain/api'

export class GalatApi extends Error {
  readonly kode: KodeGalat
  readonly status: number
  readonly fields: Readonly<Record<string, string>>

  constructor(kode: KodeGalat, pesan: string, status: number, fields: Record<string, string> = {}) {
    super(pesan)
    this.name = 'GalatApi'
    this.kode = kode
    this.status = status
    this.fields = fields
  }
}

/** Pesan yang aman ditampilkan ke pengguna. */
export function pesanGalat(galat: unknown): string {
  return galat instanceof GalatApi ? galat.message : 'Terjadi kesalahan yang tidak terduga. Coba lagi.'
}
