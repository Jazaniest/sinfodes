import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { cocokPenduduk } from '@/domain/penduduk/cari'
import { filterPendudukSchema, saringPenduduk, urutkanPenduduk, type FilterPenduduk } from '@/domain/penduduk/filter'
import type { EntriRiwayat } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { Pengguna } from '@/domain/pengguna/schema'
import { dataMilik, idPendatangTahun } from '../cakupan'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data penduduk.'
const TIDAK_DITEMUKAN = 'Data penduduk tidak ditemukan.'
const cariSchema = z.object({ kata: z.string().trim().min(1).max(100), filter: filterPendudukSchema })

/** Pengguna yang boleh melihat data penduduk, atau Response galat yang langsung dikembalikan. */
function butuhPembaca(request: Request): Pengguna | Response {
  const pengguna = butuhPengguna(request)
  if (pengguna instanceof Response) return pengguna
  return boleh(pengguna.peran, 'penduduk.lihat') ? pengguna : balasGalat('FORBIDDEN', TIDAK_BERHAK, 403)
}

function daftarTersaring(pengguna: Pengguna, filter: FilterPenduduk, kata: string | null): Response {
  const milik = dataMilik(pengguna)
  const hariIni = new Date()
  const nomorKkPerId = new Map(milik.semuaKeluarga.map((k) => [k.id, k.nomorKk] as const))
  const nomorKk = (p: Penduduk) => nomorKkPerId.get(p.keluargaId) ?? ''
  const calon = kata === null ? milik.penduduk : milik.penduduk.filter((p) => cocokPenduduk(p, kata, nomorKk(p)))
  const tersaring = saringPenduduk(calon, filter, {
    hariIni,
    dusunIdPerNomor: new Map(milik.dusun.map((d) => [d.nomor, d.id] as const)),
    idPendatangTahunIni: idPendatangTahun(milik.mutasi, tanggalIsoWib(hariIni).slice(0, 4)),
  })
  const nomorDusun = (id: string) => milik.dusun.find((d) => d.id === id)?.nomor ?? Number.MAX_SAFE_INTEGER
  return balasDaftar(urutkanPenduduk(tersaring, filter.urut, { nomorDusun }), filter.page, filter.pageSize, (p) => ({
    ...p,
    nomorKk: nomorKk(p),
  }))
}

export const handlerPenduduk = [
  http.get(
    `${API}/penduduk/ringkasan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const diperbaruiPada = milik.penduduk.reduce<string | null>(
        (maks, p) => (maks === null || p.diubahPada > maks ? p.diubahPada : maks),
        null,
      )
      return HttpResponse.json({
        jiwa: milik.penduduk.filter((p) => p.statusDasar === 'Hidup').length,
        kk: milik.keluarga.length,
        diperbaruiPada,
      })
    }),
  ),
  http.get(
    `${API}/penduduk`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterPendudukSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)
      return daftarTersaring(pengguna, filter.data, null)
    }),
  ),
  http.post(
    `${API}/penduduk/cari`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const isian = cariSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Kata pencarian atau filter tidak valid.', 422)
      return daftarTersaring(pengguna, isian.data.filter, isian.data.kata)
    }),
  ),
  http.get(
    `${API}/penduduk/:id/riwayat`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const p = milik.penduduk.find((x) => x.id === String(params.id))
      if (!p) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const mutasi = milik.mutasi.filter((m) => m.pendudukIds.includes(p.id))
      const entri: EntriRiwayat[] = [
        ...milik.riwayat
          .filter((r) => r.pendudukId === p.id)
          .map((r): EntriRiwayat => ({
            jenis: 'ubah', id: r.id, waktu: r.waktu, oleh: r.oleh, field: r.field, nilaiLama: r.nilaiLama, nilaiBaru: r.nilaiBaru,
          })),
        ...mutasi.map((m): EntriRiwayat => ({
          jenis: 'mutasi', id: m.id, waktu: m.dicatatPada, oleh: m.dicatatOleh, mutasi: m.jenis, tanggal: m.tanggal,
        })),
      ]
      // Penduduk yang masuk lewat kelahiran atau kedatangan sudah punya entri mutasi sebagai awal riwayatnya.
      if (!mutasi.some((m) => m.jenis === 'lahir' || m.jenis === 'datang')) {
        entri.push({ jenis: 'dibuat', id: `dibuat-${p.id}`, waktu: p.dibuatPada })
      }
      return HttpResponse.json(entri.sort((a, b) => b.waktu.localeCompare(a.waktu)))
    }),
  ),
  http.get(
    `${API}/penduduk/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const p = dataMilik(pengguna).penduduk.find((x) => x.id === String(params.id))
      return p ? HttpResponse.json(p) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
]
