import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import {
  isianSiaranSchema, kunciGalatSiaran, MAKS_LAMPIRAN_SIARAN_MB, type DaftarSiaranKabupaten, type DetailSiaranKabupaten, type SasaranTersedia,
} from '@/domain/kabupaten/siaran'
import { galatDariZod } from '@/domain/format/galat-isian'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { desaSasaranKabupaten } from '@sinfodes/demo/kabupaten-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'
import { notifikasiSiaran, ringkasSiaran, statusDesaSiaran, terjemahkanSasaran } from '@sinfodes/demo/siaran'
import type { DbDemo, SiaranKabupaten } from '@sinfodes/demo/tipe-db'
import { balasField, dataJson, idBaru } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuanKabupaten(request, 'kab.lihat', 'Akun ini tidak berhak membuka dasbor kabupaten.')
const butuhPengirim = (request: Request) =>
  butuhKemampuanKabupaten(request, 'kab.siaran', 'Hanya Admin Kabupaten yang mengirim dan menarik siaran.')
const tidakAda = () => balasGalat('NOT_FOUND', 'Siaran tidak ditemukan.', 404)

/** Siaran kabupaten lain sama dengan tidak ada: keberadaannya pun tidak dibocorkan (SPEC-V0.2 §5.1). */
const cariSiaran = (db: DbDemo, id: string, kabupatenKode: string): SiaranKabupaten | undefined =>
  db.siaran.find((s) => s.id === id && s.kabupatenKode === kabupatenKode)

/** Siaran ke desa (SPEC-V0.2 §8.4): semua akun kabupaten melihat; hanya Admin yang mengirim dan menarik. */
export const handlerKabupatenSiaran = [
  http.get(
    `${API}/kabupaten/siaran`,
    denganJaringan(({ request }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const hasil: DaftarSiaranKabupaten = {
        data: db.siaran
          .filter((s) => s.kabupatenKode === akun.kabupatenKode)
          .sort((a, b) => b.dikirimPada.localeCompare(a.dikirimPada))
          .map((s) => ringkasSiaran(db, s)),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  // Sebelum `/:id`, supaya "sasaran" tidak dibaca sebagai ID siaran.
  http.get(
    `${API}/kabupaten/siaran/sasaran`,
    denganJaringan(({ request }) => {
      const akun = butuhPengirim(request)
      if (akun instanceof Response) return akun
      const perKecamatan = new Map<string, SasaranTersedia['kecamatan'][number]>()
      for (const d of desaSasaranKabupaten(ambilDb(), akun.kabupatenKode)) {
        const k = perKecamatan.get(d.kecamatan.kode) ?? { kode: d.kecamatan.kode, nama: d.kecamatan.nama, desa: [] }
        k.desa.push({ id: d.id, nama: d.nama })
        perKecamatan.set(d.kecamatan.kode, k)
      }
      const hasil: SasaranTersedia = {
        kecamatan: [...perKecamatan.values()]
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
          .map((k) => ({ ...k, desa: k.desa.sort((a, b) => a.nama.localeCompare(b.nama, 'id')) })),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/kabupaten/siaran/:id`,
    denganJaringan(({ request, params }) => {
      const akun = butuhPembaca(request)
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const s = cariSiaran(db, String(params.id), akun.kabupatenKode)
      if (!s) return tidakAda()
      const hasil: DetailSiaranKabupaten = { siaran: { ...ringkasSiaran(db, s), isi: s.isi, lampiran: s.lampiran }, desa: statusDesaSiaran(db, s) }
      return HttpResponse.json(hasil)
    }),
  ),
  http.post(
    `${API}/kabupaten/siaran`,
    denganJaringan(async ({ request }) => {
      const akun = butuhPengirim(request)
      if (akun instanceof Response) return akun
      const form = await request.formData().catch(() => null)
      const isian = isianSiaranSchema.safeParse(dataJson(form))
      if (!isian.success) {
        return balasGalat('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, kunciGalatSiaran(galatDariZod(isian.error)))
      }
      const x = isian.data
      const lampiran = form?.get('lampiran')
      if (lampiran instanceof File) {
        if (!lampiran.name.toLowerCase().endsWith('.pdf')) return balasField('lampiran', 'Lampiran harus berkas PDF.')
        if (lampiran.size > MAKS_LAMPIRAN_SIARAN_MB * 1024 * 1024) return balasField('lampiran', 'Ukuran lampiran maksimal 5 MB.')
      }
      const sekarang = new Date()
      if (x.tindakLanjut && x.tindakLanjut.tenggat < tanggalIsoWib(sekarang)) return balasField('tenggat', 'Tenggat tidak boleh sebelum hari ini.')
      const db = ambilDb()
      const desa = terjemahkanSasaran(db, akun.kabupatenKode, x.sasaran)
      if (desa === 'luar') return balasField('sasaran', 'Pilih kecamatan atau desa di kabupaten ini.')
      if (desa.length === 0) return balasField('sasaran', 'Pilih paling sedikit satu desa.')
      const kabupaten = db.kabupatenMitra.find((k) => k.kode === akun.kabupatenKode)?.nama ?? ''
      // Sasaran dibekukan: desa yang bergabung kemudian tidak menerima siaran ini (keputusan rencana 7B-3).
      const baru: SiaranKabupaten = {
        id: idBaru(db, 'srn'), kabupatenKode: akun.kabupatenKode, judul: x.judul, isi: x.isi,
        lampiran: lampiran instanceof File ? { berkas: lampiran.name, ukuranKb: Math.max(1, Math.ceil(lampiran.size / 1024)) } : null,
        tindakLanjut: x.tindakLanjut, sasaran: x.sasaran, desaIds: desa.map((d) => d.id),
        dikirimPada: waktuIsoWib(sekarang), dikirimOleh: { id: akun.id, nama: akun.nama }, ditarik: null,
      }
      ubahDb((d) => {
        d.siaran.push(baru)
        d.notifikasi.push(...notifikasiSiaran(d.pengguna, baru, kabupaten))
      })
      return HttpResponse.json(ringkasSiaran(ambilDb(), baru), { status: 201 })
    }),
  ),
  http.post(
    `${API}/kabupaten/siaran/:id/tarik`,
    denganJaringan(({ request, params }) => {
      const akun = butuhPengirim(request)
      if (akun instanceof Response) return akun
      const id = String(params.id)
      const lama = cariSiaran(ambilDb(), id, akun.kabupatenKode)
      if (!lama) return tidakAda()
      if (lama.ditarik) return balasGalat('CONFLICT', 'Siaran sudah ditarik.', 409)
      const pada = waktuIsoWib(new Date())
      // Notifikasi yang sudah terkirim tetap ada; detail di panel desa menampilkan keterangan "Ditarik oleh kabupaten".
      ubahDb((d) => {
        const s = cariSiaran(d, id, akun.kabupatenKode)
        if (s) s.ditarik = { pada, oleh: { id: akun.id, nama: akun.nama } }
      })
      const db = ambilDb()
      const s = cariSiaran(db, id, akun.kabupatenKode)
      return s ? HttpResponse.json(ringkasSiaran(db, s)) : tidakAda()
    }),
  ),
]
