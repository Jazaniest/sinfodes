import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import {
  isianTenggatSchema, statusKirim, type DaftarTenggat, type DesaTenggat, type DetailTenggat, type RingkasTenggat,
} from '@/domain/kabupaten/tenggat'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { desaSasaranKabupaten } from '../kabupaten-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'
import type { DbDemo, TenggatLaporan } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, idBaru } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuanKabupaten(request, 'kab.lihat', 'Akun ini tidak berhak membuka dasbor kabupaten.')
const butuhPengatur = (request: Request) => butuhKemampuanKabupaten(request, 'kab.tenggat', 'Hanya Admin Kabupaten yang mengatur tenggat laporan.')
const TANGGAL_LAMPAU = 'Tanggal tenggat tidak boleh sebelum hari ini.'
const tidakAda = () => balasGalat('NOT_FOUND', 'Tenggat tidak ditemukan.', 404)

/** Tenggat kabupaten lain sama dengan tidak ada: keberadaannya pun tidak dibocorkan (SPEC-V0.2 §5.1). */
const cariTenggat = (db: DbDemo, id: string, kabupatenKode: string): TenggatLaporan | undefined =>
  db.tenggatLaporan.find((t) => t.id === id && t.kabupatenKode === kabupatenKode)

function statusDesa(db: DbDemo, t: TenggatLaporan, hariIni: string): DesaTenggat[] {
  return desaSasaranKabupaten(db, t.kabupatenKode)
    .map((d) => {
      const kirim = db.kirimLaporan.find((k) => k.tenggatId === t.id && k.desaId === d.id)?.tanggal ?? null
      return { id: d.id, nama: d.nama, kecamatan: d.kecamatan.nama, status: statusKirim(t.tanggal, kirim, hariIni), tanggalKirim: kirim }
    })
    .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan, 'id') || a.nama.localeCompare(b.nama, 'id'))
}

function ringkas(db: DbDemo, t: TenggatLaporan, hariIni: string): RingkasTenggat {
  const desa = statusDesa(db, t, hariIni)
  return {
    id: t.id, nama: t.nama, tanggal: t.tanggal, sasaran: desa.length,
    dikirim: desa.filter((d) => d.status === 'dikirim' || d.status === 'terlambat').length,
    terlambat: desa.filter((d) => d.status === 'terlambat').length,
  }
}

/** Tenggat laporan Dana Desa (SPEC-V0.2 §8.3 butir 4): semua akun kabupaten melihat; hanya Admin yang mengatur. */
export const handlerKabupatenTenggat = [
  http.get(
    `${API}/kabupaten/tenggat`,
    denganJaringan(({ request }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const hariIni = tanggalIsoWib(new Date())
      const milik = db.tenggatLaporan.filter((t) => t.kabupatenKode === akun.kabupatenKode).map((t) => ringkas(db, t, hariIni))
      const hasil: DaftarTenggat = {
        akanDatang: milik.filter((t) => t.tanggal >= hariIni).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
        sudahLewat: milik.filter((t) => t.tanggal < hariIni).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/kabupaten/tenggat/:id`,
    denganJaringan(({ request, params }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const t = cariTenggat(db, String(params.id), akun.kabupatenKode)
      if (!t) return tidakAda()
      const hariIni = tanggalIsoWib(new Date())
      const hasil: DetailTenggat = { tenggat: ringkas(db, t, hariIni), desa: statusDesa(db, t, hariIni) }
      return HttpResponse.json(hasil)
    }),
  ),
  http.post(
    `${API}/kabupaten/tenggat`,
    denganJaringan(async ({ request }) => {
      const akun = butuhPengatur(request)
      if (akun instanceof Response) return akun
      const isian = isianTenggatSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const sekarang = new Date()
      if (isian.data.tanggal < tanggalIsoWib(sekarang)) return balasField('tanggal', TANGGAL_LAMPAU)
      const db = ambilDb()
      const baru: TenggatLaporan = {
        id: idBaru(db, 'tgt'), kabupatenKode: akun.kabupatenKode, nama: isian.data.nama, tanggal: isian.data.tanggal,
        dibuatPada: waktuIsoWib(sekarang), dibuatOleh: { id: akun.id, nama: akun.nama },
      }
      ubahDb((d) => {
        d.tenggatLaporan.push(baru)
      })
      return HttpResponse.json(ringkas(ambilDb(), baru, tanggalIsoWib(sekarang)), { status: 201 })
    }),
  ),
  http.patch(
    `${API}/kabupaten/tenggat/:id`,
    denganJaringan(async ({ request, params }) => {
      const akun = butuhPengatur(request)
      if (akun instanceof Response) return akun
      const isian = isianTenggatSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const hariIni = tanggalIsoWib(new Date())
      const id = String(params.id)
      const lama = cariTenggat(ambilDb(), id, akun.kabupatenKode)
      if (!lama) return tidakAda()
      // Tenggat lampau boleh diganti namanya; tanggal hanya diperiksa bila diubah.
      if (isian.data.tanggal !== lama.tanggal && isian.data.tanggal < hariIni) return balasField('tanggal', TANGGAL_LAMPAU)
      ubahDb((d) => {
        const t = cariTenggat(d, id, akun.kabupatenKode)
        if (t) Object.assign(t, { nama: isian.data.nama, tanggal: isian.data.tanggal })
      })
      const db = ambilDb()
      const t = cariTenggat(db, id, akun.kabupatenKode)
      return t ? HttpResponse.json(ringkas(db, t, hariIni)) : tidakAda()
    }),
  ),
  http.delete(
    `${API}/kabupaten/tenggat/:id`,
    denganJaringan(({ request, params }) => {
      const akun = butuhPengatur(request)
      if (akun instanceof Response) return akun
      const id = String(params.id)
      if (!cariTenggat(ambilDb(), id, akun.kabupatenKode)) return tidakAda()
      // Tanda kirim dan pengingatnya di panel desa ikut hilang.
      ubahDb((d) => {
        d.tenggatLaporan = d.tenggatLaporan.filter((t) => t.id !== id)
        d.kirimLaporan = d.kirimLaporan.filter((k) => k.tenggatId !== id)
        d.notifikasi = d.notifikasi.filter((n) => n.rujukan?.id !== id)
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
