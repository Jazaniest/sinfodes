import { http, HttpResponse } from 'msw'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { cocokPenduduk } from '@/domain/penduduk/cari'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Peran } from '@/domain/pengguna/schema'
import { perluTindakan } from '@/domain/surat/alur'
import type { JenisSurat } from '@/domain/surat/jenis'
import { pengaturanBawaan, type PengaturanSurat } from '@/domain/surat/pengaturan'
import {
  cariPermohonanSchema, filterPermohonanSchema, STATUS_PERMOHONAN, STATUS_TERBUKA,
  type BarisPermohonan, type DetailPermohonan, type Permohonan, type StatusPermohonan,
} from '@/domain/surat/permohonan'
import { dataMilik } from '../cakupan'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'

const HARI_MS = 86_400_000
export const PERMOHONAN_TIDAK_DITEMUKAN = 'Permohonan tidak ditemukan.'
const butuhPembaca = (request: Request) =>
  butuhKemampuan(request, 'surat.lihat', 'Peran Anda tidak berhak membuka Layanan Surat.')

export const pengaturanDesa = (db: DbDemo, desaId: string): PengaturanSurat =>
  db.pengaturanSurat.find((p) => p.desaId === desaId) ?? pengaturanBawaan(desaId)

/** Detail permohonan untuk ruang kerja dan tumpukan tanda tangan; null bila datanya tidak utuh. */
export function detailPermohonan(db: DbDemo, p: Permohonan): DetailPermohonan | null {
  const jenis = db.jenisSurat.find((j) => j.id === p.jenisId)
  const pemohon = db.penduduk.find((x) => x.id === p.pemohonId)
  if (!jenis || !pemohon) return null
  return {
    permohonan: p,
    jenis,
    pemohon,
    subjek: p.subjekId ? (db.penduduk.find((x) => x.id === p.subjekId) ?? null) : null,
    mutasi: p.mutasiId ? (db.mutasi.find((m) => m.id === p.mutasiId) ?? null) : null,
    pengaturan: pengaturanDesa(db, p.desaId),
    pejabat: namaPejabat(db, p.desaId),
  }
}

/** Nama Kepala Desa dan Sekretaris Desa yang sedang menjabat, untuk blok tanda tangan draf. */
export function namaPejabat(db: DbDemo, desaId: string): { kades: string; sekdes: string } {
  const nama = (peran: Peran) => db.pengguna.find((u) => u.desaId === desaId && u.peran === peran && u.aktif)?.nama ?? '—'
  return { kades: nama('kades'), sekdes: nama('sekdes') }
}

/** Balasan GET detail dan setiap aksi (Tugas 7 tahap 2B-1). */
export function balasDetail(db: DbDemo, p: Permohonan): Response {
  const detail = detailPermohonan(db, p)
  return detail ? HttpResponse.json(detail) : balasGalat('SERVER', 'Data permohonan tidak utuh.', 500)
}

export function keBaris(p: Permohonan, jenis: ReadonlyMap<string, JenisSurat>, penduduk: ReadonlyMap<string, Penduduk>): BarisPermohonan {
  const j = jenis.get(p.jenisId)
  const orang = penduduk.get(p.pemohonId)
  return {
    id: p.id,
    noUrut: p.noUrut,
    status: p.status,
    tahap: p.tahap,
    dikembalikan: p.dikembalikan !== null,
    kanal: p.kanal,
    masukPada: p.masukPada,
    ditutupPada: p.ditutupPada,
    jenis: { id: p.jenisId, kode: j?.kode ?? '?', nama: j?.nama ?? 'Jenis surat tidak dikenal' },
    pemohon: { id: p.pemohonId, nama: orang?.nama ?? 'Penduduk tidak ditemukan', nik: orang?.nik ?? null },
    nomor: p.terbit?.nomor ?? null,
  }
}

/** Permohonan yang boleh dilihat (Kepala Dusun: dusunnya), beserta peta jenis dan penduduk desa untuk baris daftar. */
export function suratMilik(pengguna: Parameters<typeof dataMilik>[0]) {
  const milik = dataMilik(pengguna)
  return {
    ...milik,
    petaJenis: new Map(milik.jenisSurat.map((j) => [j.id, j])),
    petaPenduduk: new Map(milik.db.penduduk.filter((p) => p.desaId === pengguna.desaId).map((p) => [p.id, p])),
  }
}

/** Tanggal pertama periode (YYYY-MM-DD WIB): 14 hari terakhir berarti hari ini dan 13 hari sebelumnya. */
const awalPeriode = (hari: number) => tanggalIsoWib(new Date(Date.now() - (hari - 1) * HARI_MS))

/** Jumlah permohonan per jenis surat 12 bulan terakhir: urutan langkah 1 Buat surat dan halaman Jenis Surat. */
export function hitungPakai(permohonan: readonly Permohonan[]): Map<string, number> {
  const awal = awalPeriode(365)
  const pakai = new Map<string, number>()
  for (const p of permohonan) if (p.masukPada.slice(0, 10) >= awal) pakai.set(p.jenisId, (pakai.get(p.jenisId) ?? 0) + 1)
  return pakai
}
const terbuka = (s: StatusPermohonan) => STATUS_TERBUKA.includes(s)
const dalamPeriode = (p: Permohonan, awal: string) => terbuka(p.status) || p.masukPada.slice(0, 10) >= awal
const urutkan = (status: StatusPermohonan) => (a: Permohonan, b: Permohonan) =>
  terbuka(status)
    ? a.masukPada.localeCompare(b.masukPada)
    : (b.ditutupPada ?? b.masukPada).localeCompare(a.ditutupPada ?? a.masukPada)
const idJenisDariKode = (jenis: readonly JenisSurat[], kode: string | null | undefined) =>
  kode ? (jenis.find((j) => j.kode === kode)?.id ?? 'tidak-ada') : null

export const handlerSurat = [
  http.get(
    `${API}/jenis-surat`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const { jenisSurat, permohonan } = dataMilik(pengguna)
      const pakai = hitungPakai(permohonan)
      const daftar = jenisSurat.map((j) => ({ ...j, jumlahPakai: pakai.get(j.id) ?? 0 }))
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  // Didaftarkan sebelum /permohonan/:id supaya "jumlah" tidak dibaca sebagai ID.
  http.get(
    `${API}/permohonan/jumlah`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterPermohonanSchema
        .pick({ periode: true, jenis: true })
        .safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)
      const { permohonan, jenisSurat } = dataMilik(pengguna)
      const idJenis = idJenisDariKode(jenisSurat, filter.data.jenis)
      const awal = awalPeriode(filter.data.periode)
      const status = Object.fromEntries(STATUS_PERMOHONAN.map((s) => [s, 0])) as Record<StatusPermohonan, number>
      for (const p of permohonan) {
        if ((idJenis === null || p.jenisId === idJenis) && dalamPeriode(p, awal)) status[p.status] += 1
      }
      return HttpResponse.json({ status, perluTindakan: perluTindakan(pengguna.peran, permohonan) })
    }),
  ),
  http.get(
    `${API}/permohonan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterPermohonanSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasGalat('VALIDATION', 'Filter tidak valid.', 422)
      const f = filter.data
      const { permohonan, jenisSurat, petaJenis, petaPenduduk } = suratMilik(pengguna)
      const idJenis = idJenisDariKode(jenisSurat, f.jenis)
      const awal = awalPeriode(f.periode)
      const daftar = permohonan
        .filter((p) => p.status === f.status && (idJenis === null || p.jenisId === idJenis) && dalamPeriode(p, awal))
        .sort(urutkan(f.status))
      return balasDaftar(daftar, f.page, f.pageSize, (p) => keBaris(p, petaJenis, petaPenduduk))
    }),
  ),
  http.post(
    `${API}/permohonan/cari`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const isian = cariPermohonanSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { kata, jenis } = isian.data
      const { permohonan, jenisSurat, petaJenis, petaPenduduk } = suratMilik(pengguna)
      const idJenis = idJenisDariKode(jenisSurat, jenis)
      const cocokOrang = (id: string | null) => {
        const orang = id ? petaPenduduk.get(id) : undefined
        return orang !== undefined && cocokPenduduk(orang, kata, '')
      }
      // Kata bergaris miring dibaca sebagai nomor surat; selain itu nama atau potongan NIK pemohon/subjek.
      const cocok = (p: Permohonan) =>
        kata.includes('/') ? (p.terbit?.nomor.includes(kata.toUpperCase()) ?? false) : cocokOrang(p.pemohonId) || cocokOrang(p.subjekId)
      const daftar = permohonan
        .filter((p) => (idJenis === null || p.jenisId === idJenis) && cocok(p))
        .sort((a, b) => b.masukPada.localeCompare(a.masukPada))
      return balasDaftar(daftar, 1, 100, (p) => keBaris(p, petaJenis, petaPenduduk))
    }),
  ),
  http.get(
    `${API}/permohonan/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const { db, permohonan } = dataMilik(pengguna)
      const p = permohonan.find((x) => x.id === String(params.id))
      return p ? balasDetail(db, p) : balasGalat('NOT_FOUND', PERMOHONAN_TIDAK_DITEMUKAN, 404)
    }),
  ),
]
