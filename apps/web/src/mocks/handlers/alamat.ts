import { http, HttpResponse } from 'msw'
import type { HasilAlamat } from '@/domain/alamat/schema'
import { kabupatenDariLabel } from '@/domain/kabupaten/wilayah'
import type { Desa } from '@/domain/wilayah/schema'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { konteksPermintaan } from '../konteks-permintaan'
import type { DbDemo } from '../tipe-db'
import { versiTerbit } from './website'

function tampilanWarga(db: DbDemo, desa: Desa) {
  const t = versiTerbit(db, desa.id).tema
  return { warnaUtama: t.warnaUtama, logo: t.logo ?? desa.lambang ?? null, fotoLatar: t.warga.fotoLatar, sambutan: t.warga.sambutan, huruf: t.huruf }
}

/** GET /alamat (SPEC-V0.2 §4.5): desa pemilik alamat, alias alamat lama, atau induk/Konsol. */
export const handlerAlamat = [
  http.get(
    `${API}/alamat`,
    denganJaringan(({ request }) => {
      const k = konteksPermintaan(request)
      if (k.jenis === 'induk' || k.jenis === 'konsol') return HttpResponse.json({ jenis: k.jenis } satisfies HasilAlamat)
      if (k.jenis === 'kabupaten') {
        const kab = kabupatenDariLabel(k.label)
        if (!kab) return balasGalat('NOT_FOUND', 'Alamat tidak dikenal.', 404)
        const mitra = ambilDb().kabupatenMitra.some((m) => m.label === k.label)
        return HttpResponse.json({ jenis: 'kabupaten', kabupaten: { label: k.label, ...kab, mitra } } satisfies HasilAlamat)
      }
      if (k.jenis !== 'desa') return balasGalat('NOT_FOUND', 'Alamat tidak dikenal.', 404)
      const db = ambilDb()
      const desa = db.desa.find((d) => d.slug === k.label)
      if (desa) {
        return HttpResponse.json({
          jenis: 'desa',
          desa: {
            label: desa.slug, nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama, status: desa.status,
            lambang: desa.lambang ?? null,
            tampilanWarga: desa.status === 'Persiapan' ? null : tampilanWarga(db, desa),
          },
        } satisfies HasilAlamat)
      }
      const alias = db.aliasAlamat.find((a) => a.label === k.label)
      const tujuan = alias ? db.desa.find((d) => d.id === alias.desaId) : undefined
      if (tujuan) return HttpResponse.json({ jenis: 'alias', labelBaru: tujuan.slug } satisfies HasilAlamat)
      return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
    }),
  ),
]
