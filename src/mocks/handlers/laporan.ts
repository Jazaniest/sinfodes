import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { filterLaporanSchema, tolakLaporanSchema } from '@/domain/laporan/schema'
import { ubahPendudukSchema } from '@/domain/penduduk/masukan'
import { daftarPerubahan } from '@/domain/penduduk/perubahan'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import {
  bacaJson, balasIsianTidakValid, butuhKemampuan, butuhPengubah, catatAktivitas, catatRiwayat, pelakuDari,
} from '../tulis'

const butuhPembaca = (request: Request) =>
  butuhKemampuan(request, 'penduduk.lihat', 'Peran Anda tidak berhak melihat laporan data warga.')
const TIDAK_DITEMUKAN = 'Laporan tidak ditemukan.'
const SUDAH_DITANGANI = 'Laporan ini sudah ditangani.'

export const handlerLaporan = [
  http.get(
    `${API}/laporan-data`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterLaporanSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)
      const { status, jenis, pendudukId } = filter.data
      const daftar = dataMilik(pengguna)
        .laporanData.filter(
          (l) =>
            (status === undefined || l.status === status) &&
            (jenis === undefined || l.isi.jenis === jenis) &&
            (pendudukId === undefined || (l.isi.jenis === 'perbaikan' && l.isi.pendudukId === pendudukId)),
        )
        .sort((a, b) => a.dibuatPada.localeCompare(b.dibuatPada))
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.get(
    `${API}/laporan-data/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const l = dataMilik(pengguna).laporanData.find((x) => x.id === String(params.id))
      return l ? HttpResponse.json(l) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
  http.post(
    `${API}/laporan-data/:id/terapkan`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const l = milik.laporanData.find((x) => x.id === String(params.id))
      if (!l) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      if (l.status !== 'baru') return balasGalat('CONFLICT', SUDAH_DITANGANI, 409)
      const isi = l.isi
      if (isi.jenis !== 'perbaikan') return balasGalat('VALIDATION', 'Laporan kelahiran dicatat lewat alur Catat kelahiran.', 422)
      const p = milik.penduduk.find((x) => x.id === isi.pendudukId)
      if (!p) return balasGalat('NOT_FOUND', 'Data penduduk tidak ditemukan.', 404)
      const ubah = ubahPendudukSchema.safeParse({ [isi.field]: isi.nilaiBaru })
      if (!ubah.success) {
        return balasGalat(
          'VALIDATION',
          `Nilai yang dilaporkan tidak valid untuk ${LABEL_FIELD[isi.field].toLowerCase()}. Tolak laporan ini, atau ubah datanya lewat Ubah.`,
          422,
        )
      }
      const perubahan = daftarPerubahan(p, ubah.data)
      const waktu = waktuIsoWib(new Date())
      const oleh = pelakuDari(pengguna)
      ubahDb((d) => {
        if (perubahan.length > 0) {
          Object.assign(p, ubah.data, { diubahPada: waktu })
          catatRiwayat(d, p, perubahan, oleh, waktu)
        }
        l.status = 'diterapkan'
        l.ditangani = { oleh, pada: waktu, alasan: null }
        catatAktivitas(d, {
          desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'laporan-diterapkan',
          ringkasan: `Laporan warga diterapkan · ${p.nama} (${LABEL_FIELD[isi.field]})`, oleh, rujukan: { jenis: 'penduduk', id: p.id },
        })
      })
      return HttpResponse.json({ laporan: l, penduduk: p })
    }),
  ),
  http.post(
    `${API}/laporan-data/:id/tolak`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPengubah(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const l = milik.laporanData.find((x) => x.id === String(params.id))
      if (!l) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      if (l.status !== 'baru') return balasGalat('CONFLICT', SUDAH_DITANGANI, 409)
      const isian = tolakLaporanSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const isi = l.isi
      const pendudukId = isi.jenis === 'perbaikan' ? isi.pendudukId : null
      const subjek =
        isi.jenis === 'perbaikan' ? (milik.penduduk.find((p) => p.id === pendudukId)?.nama ?? 'penduduk') : `kelahiran ${isi.nama}`
      const waktu = waktuIsoWib(new Date())
      const oleh = pelakuDari(pengguna)
      ubahDb((d) => {
        l.status = 'ditolak'
        l.ditangani = { oleh, pada: waktu, alasan: isian.data.alasan || null }
        catatAktivitas(d, {
          desaId: l.desaId, dusunId: l.dusunId, waktu, jenis: 'laporan-ditolak', ringkasan: `Laporan warga ditolak · ${subjek}`, oleh,
          rujukan: pendudukId ? { jenis: 'penduduk', id: pendudukId } : null,
        })
      })
      return HttpResponse.json({ laporan: l })
    }),
  ),
]
