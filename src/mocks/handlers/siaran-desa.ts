import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { statusSiaranDesa, tindakLanjutSchema, type ButirSiaranDesa, type DaftarSiaranDesa, type DetailSiaranDesa } from '@/domain/kabupaten/siaran'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { siaranUntukDesa } from '../siaran'
import type { DbDemo, SiaranKabupaten } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'siaran.lihat', 'Peran Anda tidak membuka Siaran kabupaten.')
const butuhPenindak = (request: Request) =>
  butuhKemampuan(request, 'siaran.tindak', 'Hanya Kepala Desa dan Sekretaris Desa yang menandai tindak lanjut.')
const tidakAda = () => balasGalat('NOT_FOUND', 'Siaran tidak ditemukan.', 404)

/** Siaran di luar sasaran beku desa ini sama dengan tidak ada: keberadaannya tidak dibocorkan. */
const cariSiaranDesa = (db: DbDemo, desaId: string, id: string): SiaranKabupaten | undefined =>
  siaranUntukDesa(db, desaId).find((s) => s.id === id)

const barisBaca = (db: DbDemo, s: SiaranKabupaten, desaId: string) => db.bacaSiaran.find((b) => b.siaranId === s.id && b.desaId === desaId)

function butir(db: DbDemo, s: SiaranKabupaten, desaId: string): ButirSiaranDesa {
  return {
    id: s.id, judul: s.judul, dikirimPada: s.dikirimPada, tindakLanjut: s.tindakLanjut, status: statusSiaranDesa(barisBaca(db, s, desaId)),
    ditarik: s.ditarik ? { pada: s.ditarik.pada } : null,
  }
}

/** Setelah ditarik, isi dan lampiran tidak dikirim lagi ke desa (keputusan rencana 7B-3). */
function detail(db: DbDemo, s: SiaranKabupaten, desaId: string): DetailSiaranDesa {
  const b = barisBaca(db, s, desaId)
  return {
    ...butir(db, s, desaId),
    kabupaten: db.kabupatenMitra.find((k) => k.kode === s.kabupatenKode)?.nama ?? '',
    isi: s.ditarik ? null : s.isi,
    lampiran: s.ditarik ? null : s.lampiran,
    dibaca: b ? { pada: b.dibaca.pada, olehNama: b.dibaca.oleh.nama } : null,
    ditindaklanjuti: b?.tindakLanjut ? { pada: b.tindakLanjut.pada, olehNama: b.tindakLanjut.oleh.nama, catatan: b.tindakLanjut.catatan } : null,
  }
}

/**
 * Siaran kabupaten di panel desa (SPEC-V0.2 §8.4): dibaca begitu dibuka siapa pun di desa itu, lewat POST supaya pramuat rute
 * tidak ikut menandai; Kades atau Sekdes menandai tindak lanjut.
 */
export const handlerSiaranDesa = [
  http.get(
    `${API}/siaran`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === pengguna.desaId)
      const hasil: DaftarSiaranDesa = {
        kabupaten: db.kabupatenMitra.find((k) => k.kode === desa?.kabupaten.kode)?.nama ?? null,
        data: siaranUntukDesa(db, pengguna.desaId).map((s) => butir(db, s, pengguna.desaId)),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/siaran/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const s = cariSiaranDesa(db, pengguna.desaId, String(params.id))
      return s ? HttpResponse.json(detail(db, s, pengguna.desaId)) : tidakAda()
    }),
  ),
  http.post(
    `${API}/siaran/:id/dibaca`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const id = String(params.id)
      const s = cariSiaranDesa(ambilDb(), pengguna.desaId, id)
      if (!s) return tidakAda()
      // Hanya pembuka pertama yang dicatat; siaran yang sudah ditarik tidak dicatat lagi.
      if (!s.ditarik && !barisBaca(ambilDb(), s, pengguna.desaId)) {
        ubahDb((d) => {
          d.bacaSiaran.push({
            siaranId: id, desaId: pengguna.desaId, dibaca: { pada: waktuIsoWib(new Date()), oleh: { id: pengguna.id, nama: pengguna.nama } },
            tindakLanjut: null,
          })
        })
      }
      return HttpResponse.json(detail(ambilDb(), s, pengguna.desaId))
    }),
  ),
  http.post(
    `${API}/siaran/:id/tindak-lanjut`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenindak(request)
      if (pengguna instanceof Response) return pengguna
      const isian = tindakLanjutSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const id = String(params.id)
      const s = cariSiaranDesa(ambilDb(), pengguna.desaId, id)
      if (!s) return tidakAda()
      if (s.ditarik) return balasGalat('CONFLICT', 'Siaran sudah ditarik oleh kabupaten.', 409)
      if (!s.tindakLanjut) return balasGalat('VALIDATION', 'Siaran ini tidak memerlukan tindak lanjut.', 422)
      if (barisBaca(ambilDb(), s, pengguna.desaId)?.tindakLanjut) return balasGalat('CONFLICT', 'Siaran sudah ditandai ditindaklanjuti.', 409)
      const pada = waktuIsoWib(new Date())
      const oleh = { id: pengguna.id, nama: pengguna.nama }
      const tindakLanjut = { pada, oleh, catatan: isian.data.catatan }
      ubahDb((d) => {
        const ada = d.bacaSiaran.find((b) => b.siaranId === id && b.desaId === pengguna.desaId)
        // Menandai tindak lanjut sekaligus mencatat dibaca bila belum.
        if (ada) ada.tindakLanjut = tindakLanjut
        else d.bacaSiaran.push({ siaranId: id, desaId: pengguna.desaId, dibaca: { pada, oleh }, tindakLanjut })
      })
      return HttpResponse.json(detail(ambilDb(), s, pengguna.desaId))
    }),
  ),
]
