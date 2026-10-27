import type { HasilAlamat } from '@sinfodes/kontrak/alamat/schema'
import { Hono } from 'hono'
import { GalatApp } from '../../galat'
import type { LingkunganApp } from '../../lapisan/konteks'

/**
 * GET /api/v1/alamat (SPEC-V0.2 §4.5): apa yang ada di alamat ini. Tidak butuh sesi: dipakai halaman masuk untuk menampilkan
 * nama dan tema desa. Alamat kabupaten dikenali dari tabel mitra, atau dari tabel kode wilayah (`mitra: false`).
 */
export function ruteAlamat(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()
  rute.get('/', (c) => {
    const { konteks, desa, labelBaru, kabupaten } = c.get('alamat')
    if (konteks.jenis === 'induk' || konteks.jenis === 'konsol') return c.json({ jenis: konteks.jenis } satisfies HasilAlamat)
    if (konteks.jenis === 'kabupaten') {
      if (!kabupaten) throw new GalatApp('NOT_FOUND', 'Alamat tidak dikenal.', 404)
      return c.json({ jenis: 'kabupaten', kabupaten: { label: kabupaten.label, kode: kabupaten.kode, nama: kabupaten.nama, mitra: kabupaten.mitra } } satisfies HasilAlamat)
    }
    if (konteks.jenis !== 'desa') throw new GalatApp('NOT_FOUND', 'Alamat tidak dikenal.', 404)
    if (desa) {
      const d = desa.desa
      return c.json({
        jenis: 'desa',
        desa: {
          label: d.slug,
          nama: d.nama,
          kecamatan: d.kecamatan.nama,
          kabupaten: d.kabupaten.nama,
          status: d.status,
          lambang: d.lambang ?? null,
          tampilanWarga: d.status === 'Persiapan' ? null : desa.tampilanWarga,
        },
      } satisfies HasilAlamat)
    }
    if (labelBaru) return c.json({ jenis: 'alias', labelBaru } satisfies HasilAlamat)
    throw new GalatApp('NOT_FOUND', 'Desa tidak ditemukan.', 404)
  })
  return rute
}
