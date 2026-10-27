import type { KonteksAlamat } from '@sinfodes/kontrak/alamat/alamat'
import type { IdentitasKabupaten, PenggunaKabupaten } from '@sinfodes/kontrak/kabupaten/schema'
import type { PenggunaKonsol } from '@sinfodes/kontrak/konsol/schema'
import type { PenggunaSesi } from '@sinfodes/kontrak/pengguna/schema'
import type { DesaRekam } from '../basisdata/desa'
import type { Db } from '../basisdata/klien'
import type { Waktu } from '../waktu'

/** Kabupaten di alamat `kab-...`: dari tabel mitra bila sudah bergabung, kalau tidak dari tabel kode wilayah (`mitra: false`). */
export type KabupatenAlamat = { kode: string; nama: string; label: string; mitra: boolean }

/** Alamat permintaan: jenisnya, desa pemilik alamat (bila ada), slug baru bila alias lama, dan kabupatennya bila alamat kabupaten. */
export type AlamatPermintaan = { konteks: KonteksAlamat; desa: DesaRekam | null; labelBaru: string | null; kabupaten: KabupatenAlamat | null }

/** Pelaku panel desa: pengguna dari sesi yang sah, plus ID sesinya (untuk keluar dan jejak audit). */
export type PelakuPanel = PenggunaSesi & { jenis: 'panel'; sesiId: string }
/** Nama lama dari 8C; maknanya tetap pelaku panel. */
export type Pelaku = PelakuPanel
export type PelakuWarga = { jenis: 'warga'; sesiId: string; pendudukId: string; desaId: string }
export type PelakuKonsol = { jenis: 'konsol'; sesiId: string; pengguna: PenggunaKonsol }
export type PelakuKabupaten = { jenis: 'kabupaten'; sesiId: string; pengguna: PenggunaKabupaten; kabupaten: IdentitasKabupaten }
export type PelakuAktif = PelakuPanel | PelakuWarga | PelakuKonsol | PelakuKabupaten

/**
 * Peubah konteks Hono. `dbTransaksi` sengaja tidak dibaca langsung oleh rute: lewat `butuhAkses` dan pembantu `butuh...` atau
 * lewat `dbTanpaPelaku` (masuk), supaya rute yang lupa memeriksa sesi tidak punya jalan ke data.
 */
export type Peubah = {
  idPermintaan: string
  waktu: Waktu
  alamat: AlamatPermintaan
  dbTransaksi: Db | null
  pelaku: PelakuAktif | null
}
export type LingkunganApp = { Variables: Peubah }
