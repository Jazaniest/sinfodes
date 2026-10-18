import { http, HttpResponse } from 'msw'
import { JUMLAH_DESA_KABUPATEN } from '@/domain/kabupaten/jumlah-desa'
import type { DesaPortal, PortalKabupaten } from '@/domain/kabupaten/portal'
import { kabupatenDariLabel } from '@/domain/kabupaten/wilayah'
import type { Desa } from '@/domain/wilayah/schema'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { konteksPermintaan } from '../konteks-permintaan'

const urutNama = (a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama, 'id')
const bergabung = (d: Desa): d is Desa & { status: DesaPortal['status'] } => d.status === 'Aktif' || d.status === 'Uji coba'

/** Portal publik kabupaten (SPEC-V0.2 §8.2): terbuka tanpa masuk, kabupatennya dari alamat. */
export const handlerPortalKabupaten = [
  http.get(
    `${API}/kabupaten/portal`,
    denganJaringan(({ request }) => {
      const k = konteksPermintaan(request)
      const wilayah = k.jenis === 'kabupaten' ? kabupatenDariLabel(k.label) : null
      if (k.jenis !== 'kabupaten' || !wilayah) return balasGalat('NOT_FOUND', 'Alamat tidak dikenal.', 404)
      const kabupaten = { ...wilayah, label: k.label }
      const db = ambilDb()
      if (!db.kabupatenMitra.some((m) => m.label === k.label)) {
        return HttpResponse.json({ mitra: false, kabupaten } satisfies PortalKabupaten)
      }
      const semua = db.desa.filter((d) => d.kabupaten.kode === wilayah.kode)
      const perKecamatan = new Map<string, { kecamatan: Desa['kecamatan']; desa: DesaPortal[] }>()
      for (const d of semua.filter(bergabung)) {
        const kec = perKecamatan.get(d.kecamatan.kode) ?? { kecamatan: d.kecamatan, desa: [] }
        kec.desa.push({ label: d.slug, nama: d.nama, status: d.status })
        perKecamatan.set(d.kecamatan.kode, kec)
      }
      const kecamatan = [...perKecamatan.values()]
        .sort((a, b) => urutNama(a.kecamatan, b.kecamatan))
        .map((kec) => ({ kecamatan: { kode: kec.kecamatan.kode, nama: kec.kecamatan.nama }, desa: kec.desa.sort(urutNama) }))
      const hasil: PortalKabupaten = {
        mitra: true,
        kabupaten,
        bergabung: kecamatan.reduce((n, kec) => n + kec.desa.length, 0),
        // Sama dengan Ringkasan dasbor: kabupaten tanpa angka resmi memakai jumlah desa pelanggannya.
        jumlahDesa: JUMLAH_DESA_KABUPATEN[wilayah.kode] ?? semua.length,
        kecamatan,
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
