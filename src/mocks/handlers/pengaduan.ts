import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import {
  balasanPengaduanSchema, barisPengaduanSchema, filterPengaduanSchema, periksaUbahStatus, STATUS_PENGADUAN, ubahStatusPengaduanSchema,
  type Pengaduan,
} from '@/domain/pengaduan/schema'
import { cakupanDusun } from '@/domain/pengguna/hak-akses'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { bacaJson, balasIsianTidakValid, butuhKemampuan, catatAktivitas, idBaru, pelakuDari } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'pengaduan.lihat', 'Peran Anda tidak berhak membuka Pengaduan.')
const butuhPenanggap = (request: Request) =>
  butuhKemampuan(request, 'pengaduan.tanggapi', 'Peran Anda tidak berhak menanggapi pengaduan.')
const TIDAK_DITEMUKAN = 'Pengaduan tidak ditemukan.'

/** Pengaduan dalam cakupan pengguna: desanya; Kepala Dusun hanya dusunnya (SPEC §5.1). */
function pengaduanMilik(pengguna: PenggunaSesi): Pengaduan[] {
  const dusunSaja = cakupanDusun(pengguna)
  return ambilDb().pengaduan.filter((a) => a.desaId === pengguna.desaId && (dusunSaja === null || a.dusunId === dusunSaja))
}

/** Kotak masuk dan percakapan pengaduan (SPEC §8). Pengaduan baru dari warga masuk lewat layanan warga (Tahap 4). */
export const handlerPengaduan = [
  http.get(
    `${API}/pengaduan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterPengaduanSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const f = filter.data
      const dusunId =
        f.dusun === undefined ? null : (ambilDb().dusun.find((d) => d.desaId === pengguna.desaId && d.nomor === f.dusun)?.id ?? '-')
      const daftar = pengaduanMilik(pengguna)
        .filter(
          (a) =>
            a.status === f.status && (f.kategori === undefined || a.kategori === f.kategori) && (dusunId === null || a.dusunId === dusunId),
        )
        // Baru: yang paling lama menunggu di atas. Ditanggapi dan Selesai: terbaru dulu.
        .sort((a, b) => (f.status === 'baru' ? a.masukPada.localeCompare(b.masukPada) : b.masukPada.localeCompare(a.masukPada)))
      return balasDaftar(daftar, f.page, f.pageSize, (a) => barisPengaduanSchema.parse(a))
    }),
  ),
  // Didaftarkan sebelum /pengaduan/:id supaya "jumlah" tidak dibaca sebagai ID.
  http.get(
    `${API}/pengaduan/jumlah`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const milik = pengaduanMilik(pengguna)
      return HttpResponse.json({ status: Object.fromEntries(STATUS_PENGADUAN.map((s) => [s, milik.filter((a) => a.status === s).length])) })
    }),
  ),
  http.get(
    `${API}/pengaduan/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const a = pengaduanMilik(pengguna).find((x) => x.id === String(params.id))
      return a ? HttpResponse.json(a) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
  http.post(
    `${API}/pengaduan/:id/balasan`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenanggap(request)
      if (pengguna instanceof Response) return pengguna
      const a = pengaduanMilik(pengguna).find((x) => x.id === String(params.id))
      if (!a) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      if (a.status === 'selesai') return balasGalat('CONFLICT', 'Pengaduan sudah selesai. Buka kembali untuk membalas.', 409)
      const isian = balasanPengaduanSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const waktu = waktuIsoWib(new Date())
      const oleh = pelakuDari(pengguna)
      ubahDb((d) => {
        a.percakapan.push({ jenis: 'desa', id: idBaru(d, 'pes'), waktu, isi: isian.data.isi, oleh, jabatan: pengguna.jabatan })
        if (a.status === 'baru') {
          a.status = 'ditanggapi'
          a.tanggapanPertamaPada = waktu
        }
        catatAktivitas(d, {
          desaId: a.desaId, dusunId: a.dusunId, waktu, jenis: 'pengaduan-dibalas', ringkasan: `Pengaduan dibalas · ${a.judul}`, oleh,
          rujukan: { jenis: 'pengaduan', id: a.id },
        })
      })
      return HttpResponse.json(a)
    }),
  ),
  http.post(
    `${API}/pengaduan/:id/status`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenanggap(request)
      if (pengguna instanceof Response) return pengguna
      const a = pengaduanMilik(pengguna).find((x) => x.id === String(params.id))
      if (!a) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const isian = ubahStatusPengaduanSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const ke = isian.data.status
      const salah = periksaUbahStatus(a.status, ke)
      if (salah) return balasGalat('CONFLICT', salah, 409)
      const waktu = waktuIsoWib(new Date())
      const oleh = pelakuDari(pengguna)
      ubahDb((d) => {
        a.status = ke
        a.selesaiPada = ke === 'selesai' ? waktu : null
        a.percakapan.push({ jenis: 'status', id: idBaru(d, 'pes'), waktu, status: ke, oleh })
        catatAktivitas(d, {
          desaId: a.desaId, dusunId: a.dusunId, waktu, jenis: ke === 'selesai' ? 'pengaduan-selesai' : 'pengaduan-dibuka',
          ringkasan: ke === 'selesai' ? `Pengaduan selesai · ${a.judul}` : `Pengaduan dibuka kembali · ${a.judul}`, oleh,
          rujukan: { jenis: 'pengaduan', id: a.id },
        })
      })
      return HttpResponse.json(a)
    }),
  ),
]
