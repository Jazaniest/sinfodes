import { http, HttpResponse } from 'msw'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { dataGabunganSchema, samarkanGabungan, type BarisMentah } from '@/domain/kabupaten/data-gabungan'
import type { Desa } from '@/domain/wilayah/schema'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { desaDiKabupaten, komposisiDesa } from '../kabupaten-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'

const urutNama = (a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama, 'id')

/**
 * Data gabungan kabupaten (SPEC-V0.2 §8.3 butir 6, §5.1): angka penduduk dan bansos per desa, disamarkan di sini sebelum
 * dikirim. Angka mentah 1-4 tidak pernah keluar; skema respons menolaknya.
 */
export const handlerKabupatenDataGabungan = [
  http.get(
    `${API}/kabupaten/data-gabungan`,
    denganJaringan(({ request }) => {
      const akun = butuhKemampuanKabupaten(request, 'kab.lihat', 'Akun ini tidak berhak membuka dasbor kabupaten.')
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const kab = db.kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)
      if (!kab) return balasGalat('SERVER', 'Data kabupaten tidak ditemukan.', 500)
      const sekarang = new Date()
      const perKecamatan = new Map<string, { kecamatan: Desa['kecamatan']; desa: { id: string; nama: string; status: Desa['status']; baris: BarisMentah | null }[] }>()
      for (const d of desaDiKabupaten(db, kab.kode)) {
        const k = perKecamatan.get(d.kecamatan.kode) ?? { kecamatan: d.kecamatan, desa: [] }
        k.desa.push({ id: d.id, nama: d.nama, status: d.status, baris: komposisiDesa(db, d, sekarang) })
        perKecamatan.set(d.kecamatan.kode, k)
      }
      const kecamatan = [...perKecamatan.values()]
        .sort((a, b) => urutNama(a.kecamatan, b.kecamatan))
        .map((k) => ({ kecamatan: { kode: k.kecamatan.kode, nama: k.kecamatan.nama }, desa: [...k.desa].sort(urutNama) }))
      const hasil = dataGabunganSchema.parse({
        kabupaten: { kode: kab.kode, nama: kab.nama },
        tanggal: tanggalIsoWib(sekarang),
        ...samarkanGabungan({ kecamatan }),
      })
      return HttpResponse.json(hasil)
    }),
  ),
]
