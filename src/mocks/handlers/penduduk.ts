import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { formatAngka } from '@/domain/format/angka'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { cocokPenduduk } from '@/domain/penduduk/cari'
import { filterPendudukSchema, saringPenduduk, urutkanPenduduk, type FilterPenduduk } from '@/domain/penduduk/filter'
import type { EntriRiwayat } from '@/domain/penduduk/riwayat'
import type { BarisPenduduk, Penduduk } from '@/domain/penduduk/schema'
import { boleh, cakupanDusun } from '@/domain/pengguna/hak-akses'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { dataMilik, idPendatangTahun } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'
import { catatAktivitas, pelakuDari } from '../tulis'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data penduduk.'
const TIDAK_DITEMUKAN = 'Data penduduk tidak ditemukan.'
const cariSchema = z.object({ kata: z.string().trim().min(1).max(100), filter: filterPendudukSchema })
const eksporSchema = z.object({
  kata: z.string().trim().min(1).max(100).nullable(),
  filter: filterPendudukSchema,
  format: z.enum(['csv', 'cetak']),
})

/** Pengguna yang boleh melihat data penduduk, atau Response galat yang langsung dikembalikan. */
function butuhPembaca(request: Request): PenggunaSesi | Response {
  const pengguna = butuhPengguna(request)
  if (pengguna instanceof Response) return pengguna
  return boleh(pengguna.peran, 'penduduk.lihat') ? pengguna : balasGalat('FORBIDDEN', TIDAK_BERHAK, 403)
}

/** Penduduk sesuai filter dan kata cari, sudah diurutkan, lengkap dengan nomor KK (tanpa halaman). */
function barisTersaring(pengguna: PenggunaSesi, filter: FilterPenduduk, kata: string | null): BarisPenduduk[] {
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
  return urutkanPenduduk(tersaring, filter.urut, { nomorDusun }).map((p) => ({ ...p, nomorKk: nomorKk(p) }))
}

function daftarTersaring(pengguna: PenggunaSesi, filter: FilterPenduduk, kata: string | null): Response {
  return balasDaftar(barisTersaring(pengguna, filter, kata), filter.page, filter.pageSize)
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
  http.post(
    `${API}/penduduk/ekspor`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const isian = eksporSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Permintaan unduhan tidak valid.', 422)
      const { kata, filter, format } = isian.data
      const baris = barisTersaring(pengguna, filter, kata)
      if (baris.length === 0) return balasGalat('VALIDATION', 'Tidak ada data penduduk untuk diunduh.', 422)
      const jumlah = formatAngka(baris.length)
      // Unduhan data pribadi selalu tercatat di Buku hari ini (SPEC §5.3, §6.2).
      ubahDb((d) =>
        catatAktivitas(d, {
          desaId: pengguna.desaId, dusunId: cakupanDusun(pengguna), waktu: waktuIsoWib(new Date()), jenis: 'penduduk-ekspor',
          ringkasan: format === 'csv' ? `Data penduduk diunduh (${jumlah} baris)` : `Buku Induk Penduduk dicetak (${jumlah} baris)`,
          oleh: pelakuDari(pengguna), rujukan: null,
        }),
      )
      return HttpResponse.json({ baris })
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
