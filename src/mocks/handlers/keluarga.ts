import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { filterKeluargaSchema, type FilterKeluarga, type Keluarga } from '@/domain/keluarga/schema'
import { cocokNama, kataAngka, kataCukup } from '@/domain/penduduk/cari'
import type { Penduduk } from '@/domain/penduduk/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { Pengguna } from '@/domain/pengguna/schema'
import { dataMilik } from '../cakupan'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data keluarga.'
const cariSchema = z.object({ kata: z.string().trim().min(1).max(100), filter: filterKeluargaSchema })

function butuhPembaca(request: Request): Pengguna | Response {
  const pengguna = butuhPengguna(request)
  if (pengguna instanceof Response) return pengguna
  return boleh(pengguna.peran, 'penduduk.lihat') ? pengguna : balasGalat('FORBIDDEN', TIDAK_BERHAK, 403)
}

const anggotaDari = (k: Keluarga, perId: ReadonlyMap<string, Penduduk>) =>
  k.anggotaIds.flatMap((id) => {
    const p = perId.get(id)
    return p ? [p] : []
  })

function barisKeluarga(k: Keluarga, perId: ReadonlyMap<string, Penduduk>) {
  const anggota = anggotaDari(k, perId)
  const diperbaruiPada = anggota.reduce((maks, p) => (p.diubahPada > maks ? p.diubahPada : maks), anggota[0]?.diubahPada ?? '')
  return { ...k, namaKepala: perId.get(k.kepalaKeluargaId)?.nama ?? '', jumlahAnggota: anggota.length, diperbaruiPada }
}

/** Nomor KK (potongan ≥ 4 digit) atau nama kepala keluarga. */
function cocokKeluarga(k: Keluarga, kata: string, namaKepala: string): boolean {
  if (!kataCukup(kata)) return false
  const angka = kataAngka(kata)
  return angka !== null ? k.nomorKk.includes(angka) : cocokNama(namaKepala, kata)
}

function daftarKeluarga(pengguna: Pengguna, filter: FilterKeluarga, kata: string | null): Response {
  const milik = dataMilik(pengguna)
  const perId = new Map(milik.penduduk.map((p) => [p.id, p] as const))
  const namaKepala = (k: Keluarga) => perId.get(k.kepalaKeluargaId)?.nama ?? ''
  const dusunId = filter.dusun === undefined ? undefined : (milik.dusun.find((d) => d.nomor === filter.dusun)?.id ?? '—tidak ada—')
  const daftar = milik.keluarga
    .filter((k) => (dusunId === undefined || k.dusunId === dusunId) && (kata === null || cocokKeluarga(k, kata, namaKepala(k))))
    .sort((a, b) => namaKepala(a).localeCompare(namaKepala(b), 'id') || a.nomorKk.localeCompare(b.nomorKk))
  return balasDaftar(daftar, filter.page, filter.pageSize, (k) => barisKeluarga(k, perId))
}

export const handlerKeluarga = [
  http.get(
    `${API}/keluarga`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterKeluargaSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)
      return daftarKeluarga(pengguna, filter.data, null)
    }),
  ),
  http.post(
    `${API}/keluarga/cari`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const isian = cariSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Kata pencarian atau filter tidak valid.', 422)
      return daftarKeluarga(pengguna, isian.data.filter, isian.data.kata)
    }),
  ),
  http.get(
    `${API}/keluarga/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const keluarga = milik.keluarga.find((k) => k.id === String(params.id))
      if (!keluarga) return balasGalat('NOT_FOUND', 'Data keluarga tidak ditemukan.', 404)
      return HttpResponse.json({ keluarga, anggota: anggotaDari(keluarga, new Map(milik.penduduk.map((p) => [p.id, p] as const))) })
    }),
  ),
]
