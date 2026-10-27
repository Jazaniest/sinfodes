import { http, HttpResponse } from 'msw'
import type { HasilCariDesa, JuaraInduk, RingkasanInduk } from '@/domain/alamat/schema'
import { KATEGORI_KABUPATEN } from '@/domain/indeks/kategori'
import { labelPeriode, periodeTerakhirTutup } from '@/domain/indeks/periode'
import { ambilDb } from '../db'
import { API, denganJaringan } from '../http'
import { kategoriProvinsi, peringkatProvinsi } from '../indeks'
import { pastikanLencana } from '../lencana'

/** Kata cari terpendek dan jumlah hasil terbanyak Cari desa. */
const MIN_KATA = 3
const MAKS_HASIL = 10

/**
 * Podium bulan terakhir tutup untuk landing (rencana 7C-2 butir 12): podium antarkabupaten per provinsi (Juara Umum dan Paling
 * Merata) dan juara umum setiap kabupaten mitra. Periode berjalan tidak pernah dipakai.
 */
function juaraBulanIni(sekarang: Date): JuaraInduk {
  const db = ambilDb()
  const periode = periodeTerakhirTutup('bulanan', sekarang)
  const labelMitra = new Map(db.kabupatenMitra.map((m) => [m.kode, m.label]))
  const daftarProvinsi = [...new Map(db.desa.map((d) => [d.provinsi.kode, d.provinsi])).values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const provinsi = daftarProvinsi
    .map((p) => {
      const nilai = peringkatProvinsi(db, p.kode, periode, sekarang)
      const kategori = KATEGORI_KABUPATEN.map((k) => ({
        kategori: k,
        podium: kategoriProvinsi(k, nilai, '').podium.map((x) => ({
          peringkat: x.peringkat,
          bersama: x.bersama,
          kabupaten: { nama: x.kabupaten.nama, label: labelMitra.get(x.kabupaten.kode) ?? null },
        })),
      })).filter((k) => k.podium.length > 0)
      return { provinsi: { kode: p.kode, nama: p.nama }, kategori }
    })
    .filter((p) => p.kategori.length > 0)
  const kabupatenMitra = [...db.kabupatenMitra]
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    .map((m) => ({
      kabupaten: { nama: m.nama, label: m.label },
      juaraUmum: db.lencana
        .filter((l) => l.tingkat === 'kabupaten' && l.kategori === 'umum' && l.wilayah.kode === m.kode && l.periode.musim === periode.musim && l.periode.kode === periode.kode)
        .flatMap((l) => {
          const desa = db.desa.find((d) => d.id === l.desaId)
          return desa ? [{ peringkat: l.peringkat, bersama: l.bersama, desa: { nama: desa.nama, alamat: desa.slug } }] : []
        })
        .sort((a, b) => a.peringkat - b.peringkat || a.desa.nama.localeCompare(b.desa.nama, 'id')),
    }))
    .filter((m) => m.juaraUmum.length > 0)
  if (provinsi.length === 0 && kabupatenMitra.length === 0) return null
  return { periode: { kode: periode.kode, label: labelPeriode(periode) }, provinsi, kabupatenMitra }
}

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
      const sekarang = new Date()
      pastikanLencana(sekarang)
      const db = ambilDb()
      const desaBergabung = db.desa.filter((d) => d.status === 'Aktif' || d.status === 'Uji coba').length
      const kabupatenMitra = db.kabupatenMitra
        .map((k) => ({ label: k.label, nama: k.nama }))
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      return HttpResponse.json({ desaBergabung, kabupatenMitra, juara: juaraBulanIni(sekarang) } satisfies RingkasanInduk)
    }),
  ),
]
