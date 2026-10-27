import type { KonteksAlamat } from '@sinfodes/kontrak/alamat/alamat'
import type { PenggunaSesi } from '@sinfodes/kontrak/pengguna/schema'
import type { DesaRekam } from '../basisdata/desa'
import type { Db } from '../basisdata/klien'
import type { Waktu } from '../waktu'

/** Alamat permintaan: jenisnya, desa pemilik alamat (bila ada), dan slug baru bila alamatnya alias lama. */
export type AlamatPermintaan = { konteks: KonteksAlamat; desa: DesaRekam | null; labelBaru: string | null }

/** Pelaku panel desa: pengguna dari sesi yang sah, plus ID sesinya (untuk keluar dan jejak audit). */
export type Pelaku = PenggunaSesi & { sesiId: string }

/**
 * Peubah konteks Hono. `dbTransaksi` sengaja tidak dibaca langsung oleh rute: lewat `butuhAkses` (butuh pelaku) atau
 * `dbTanpaPelaku` (masuk), supaya rute yang lupa memeriksa sesi tidak punya jalan ke data desa.
 */
export type Peubah = {
  idPermintaan: string
  waktu: Waktu
  alamat: AlamatPermintaan
  dbTransaksi: Db | null
  pelaku: Pelaku | null
}
export type LingkunganApp = { Variables: Peubah }
