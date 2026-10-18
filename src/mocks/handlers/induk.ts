import { http, HttpResponse } from 'msw'
import type { HasilCariDesa, RingkasanInduk } from '@/domain/alamat/schema'
import { ambilDb } from '../db'
import { API, denganJaringan } from '../http'

/** Kata cari terpendek dan jumlah hasil terbanyak Cari desa. */
const MIN_KATA = 3
const MAKS_HASIL = 10

/** Halaman utama Sinfodes (SPEC-V0.2 §4.4): Cari desa dan angka desa bergabung, tanpa sesi. */
export const handlerInduk = [
  http.get(
    `${API}/induk/cari-desa`,
    denganJaringan(({ request }) => {
      const q = (new URL(request.url).searchParams.get('q') ?? '').trim().toLocaleLowerCase('id')
      if (q.length < MIN_KATA) return HttpResponse.json({ hasil: [] } satisfies HasilCariDesa)
      // Hanya desa yang websitenya tayang; desa Persiapan belum bisa dituju (SPEC-V0.2 §4.1).
      const hasil = ambilDb()
        .desa.filter((d) => d.status !== 'Persiapan' && d.nama.toLocaleLowerCase('id').includes(q))
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
        .slice(0, MAKS_HASIL)
        .map((d) => ({ label: d.slug, nama: d.nama, kecamatan: d.kecamatan.nama, kabupaten: d.kabupaten.nama }))
      return HttpResponse.json({ hasil } satisfies HasilCariDesa)
    }),
  ),
  http.get(
    `${API}/induk/ringkasan`,
    denganJaringan(() => {
      const desaBergabung = ambilDb().desa.filter((d) => d.status === 'Aktif' || d.status === 'Uji coba').length
      return HttpResponse.json({ desaBergabung } satisfies RingkasanInduk)
    }),
  ),
]
