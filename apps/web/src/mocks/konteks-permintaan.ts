import { DOMAIN_INDUK } from '@/app/alamat'
import { bacaAlamat, type KonteksAlamat } from '@/domain/alamat/alamat'
import type { Desa } from '@/domain/wilayah/schema'
import type { DbDemo } from './tipe-db'

/** Alamat yang memanggil API, dibaca dari host permintaan seperti nanti di server (SPEC-V0.2 §4.5). */
export function konteksPermintaan(request: Request): KonteksAlamat {
  return bacaAlamat(new URL(request.url).hostname, DOMAIN_INDUK)
}

/**
 * Permintaan tanpa konteks alamat memakai perilaku v0.1 (desa dari token). Di browser, `luar` dan `alihkan-induk` sudah
 * dialihkan sebelum aplikasi jalan, jadi yang tersisa hanya uji yang memanggil API di `localhost`.
 */
export const tanpaKonteks = (k: KonteksAlamat): boolean => k.jenis === 'luar' || k.jenis === 'alihkan-induk'

/** Desa pemilik alamat ini (slug sekarang, bukan alias); null untuk alamat selain desa atau desa yang tidak ada. */
export function desaKonteks(db: DbDemo, k: KonteksAlamat): Desa | null {
  return k.jenis === 'desa' ? (db.desa.find((d) => d.slug === k.label) ?? null) : null
}
