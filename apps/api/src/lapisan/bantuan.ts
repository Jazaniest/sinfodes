import { samarkanNomor16 } from '@sinfodes/kontrak/penduduk/nomor16'
import type { MiddlewareHandler } from 'hono'
import { badanGalat, GalatApp } from '../galat'
import { catatJejakBantuan } from '../sesi/repositori-bantuan'
import { PESAN_SESI_BERAKHIR } from './akses'
import type { LingkunganApp } from './konteks'

/**
 * Aturan sesi bantuan Tim Sinfodes sebagai satu lapisan menengah, bukan per rute (SPEC-V0.3 §8.6). Berlaku hanya untuk pelaku
 * panel berperan `bantuan`; pelaku lain lewat tanpa disentuh. Dipasang tepat setelah `lapisanSesi`, jadi mendahului pemilihan
 * rute: rute yang kelak ditambahkan otomatis tunduk padanya.
 */
export const PESAN_LIHAT_SAJA = 'Mode bantuan Sinfodes hanya bisa melihat.'
export const PESAN_CARI_NOMOR = 'Pencarian dengan angka NIK atau nomor KK tidak tersedia selama data pribadi warga disamarkan.'
export const PESAN_UNDUHAN = 'Unduhan tidak tersedia selama data pribadi warga disamarkan.'

/**
 * Jalur POST yang hanya membaca (pencarian memakai POST supaya kata kunci tidak masuk URL). Setiap jalur di sini lolos dari
 * penolakan tulis: modul baru menambahkan jalur pencariannya sendiri di sini setelah memastikan ia tidak mengubah data.
 */
export const JALUR_CARI_BACA: ReadonlySet<string> = new Set(['/cari', '/penduduk/cari', '/keluarga/cari'])

/**
 * Jalur POST yang hanya mengganti atau mengakhiri sesi peramban itu sendiri (keluar, masuk panel, menukar tiket baru). Tanpa
 * ini Tim yang sedang di mode bantuan tidak bisa keluar, masuk sebagai pengguna desa, atau membuka tiket berikutnya sebelum
 * sesinya berakhir. Tidak ada data desa yang dibaca atau diubah lewat jalur ini.
 */
const JALUR_SESI_BEBAS: ReadonlySet<string> = new Set(['/sesi/keluar', '/sesi/masuk', '/sesi/bantuan'])

/** Lima angka berurutan cukup untuk menebak bagian NIK atau nomor KK dari hasil yang cocok. */
const ANGKA_NOMOR = /\d{5}/
/** Spasi, titik, dan strip di antara angka diabaikan pencarian ("1405 0952 0391" sama dengan "140509520391"), jadi diabaikan juga di sini. */
const PEMISAH_ANTAR_ANGKA = /(?<=\d)[\s.-]+(?=\d)/g
/** Enam belas angka berurutan, di kunci apa pun dan di tengah kalimat; 17 atau 18 angka (mis. NIP) bukan nomor ini. */
const NOMOR16_DALAM_TEKS = /(?<!\d)\d{16}(?!\d)/g
/** NIK berkelompok enam-enam-empat seperti yang dicatat Riwayat ("140509 520391 8002"); tanpa ini ia lolos dari aturan di atas. */
const NIK_BERKELOMPOK_DALAM_TEKS = /(?<!\d)(\d{6}) (\d{6}) (\d{4})(?!\d)/g

/**
 * Menyamarkan setiap string yang memuat 16 angka berurutan menjadi `1405••••••••8002`. Berdasarkan isi, bukan nama kunci:
 * kunci baru dengan nama lain di modul berikutnya tidak membocorkan NIK.
 */
export function samarkanDataPribadi(nilai: unknown): unknown {
  if (typeof nilai === 'string') {
    return nilai
      .replace(NOMOR16_DALAM_TEKS, (n) => samarkanNomor16(n))
      .replace(NIK_BERKELOMPOK_DALAM_TEKS, (_semua, a: string, b: string, c: string) => samarkanNomor16(`${a}${b}${c}`))
  }
  if (Array.isArray(nilai)) return nilai.map(samarkanDataPribadi)
  if (nilai !== null && typeof nilai === 'object') return Object.fromEntries(Object.entries(nilai).map(([k, v]) => [k, samarkanDataPribadi(v)]))
  return nilai
}

type Deps = { catatJejak?: typeof catatJejakBantuan }

export function lapisanBantuan(deps: Deps = {}): MiddlewareHandler<LingkunganApp> {
  const catatJejak = deps.catatJejak ?? catatJejakBantuan
  return async (c, next) => {
    const pelaku = c.get('pelaku')
    if (pelaku?.jenis !== 'panel' || !pelaku.bantuan) return next()

    const url = new URL(c.req.url)
    const jalur = url.pathname.replace(/^\/api\/v1/, '')
    const metode = c.req.method
    const baca = metode === 'GET' || metode === 'HEAD'
    const cari = metode === 'POST' && JALUR_CARI_BACA.has(jalur)
    if (!baca && !cari) {
      if (metode === 'POST' && JALUR_SESI_BEBAS.has(jalur)) return next()
      throw new GalatApp('FORBIDDEN', PESAN_LIHAT_SAJA, 403)
    }

    const samarkan = pelaku.bantuan.sembunyikanDataPribadi
    // Selama NIK disamarkan, mencocokkan angka NIK atau KK sama saja dengan membukanya sedikit demi sedikit.
    if (cari && samarkan) {
      const isi: unknown = await c.req.json().catch(() => null)
      const kata = isi !== null && typeof isi === 'object' && 'kata' in isi && typeof isi.kata === 'string' ? isi.kata : ''
      if (ANGKA_NOMOR.test(kata.replace(PEMISAH_ANTAR_ANGKA, ''))) throw new GalatApp('FORBIDDEN', PESAN_CARI_NOMOR, 403)
    }

    // Jejak mendahului handler: bila jejak gagal ditulis, permintaan gagal dan tidak ada data yang keluar tanpa jejak.
    // `GET /sesi` hanya pemeriksaan sesi oleh aplikasi, bukan halaman yang dibuka.
    if (!(metode === 'GET' && jalur === '/sesi')) {
      const db = c.get('dbTransaksi')
      if (!db) throw new GalatApp('UNAUTHENTICATED', PESAN_SESI_BERAKHIR, 401)
      await catatJejak(db, { desaId: pelaku.desaId, sesiId: pelaku.sesiId, jalur: `${jalur}${url.search}`, waktu: c.get('waktu')() })
    }

    await next()

    if (!samarkan) return
    const res = c.res
    if ((res.headers.get('Content-Type') ?? '').includes('json')) {
      const tersamar = samarkanDataPribadi(await res.clone().json())
      c.res = new Response(JSON.stringify(tersamar), { status: res.status, headers: res.headers })
      c.res.headers.delete('Content-Length')
    } else if (res.status >= 200 && res.status < 300 && res.status !== 204 && res.body !== null) {
      // Tidak ada cara menyamarkan unduhan: ditolak selama penyamaran menyala.
      c.res = new Response(JSON.stringify(badanGalat('FORBIDDEN', PESAN_UNDUHAN)), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
  }
}
