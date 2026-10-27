import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import {
  alasanSchema, lunasSchema, PESAN_DITERIMA_LEWAT, PESAN_DITERIMA_SEBELUM_TRANSFER, PESAN_TIDAK_BISA_BATAL, PESAN_TIDAK_MENUNGGU, TAB_TAGIHAN,
  tabTagihan, uraiNominal, type BarisTagihanKonsol, type DaftarTagihanKonsol, type Tagihan, type TabTagihan,
} from '@/domain/langganan/tagihan'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { notifikasiAksiTagihan, type AksiTagihanKonsol } from '../pengingat-tagihan'
import { butuhPenggunaKonsol } from '../sesi-mock'
import { kwitansiTagihan, nomorKwitansiBerikut, pastikanTagihan } from '../tagihan'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, galatIsian } from '../tulis'

const TIDAK_DITEMUKAN = 'Tagihan tidak ditemukan.'
const PESAN_ISIAN = 'Isian belum lengkap atau tidak valid.'
const MAKS_HASIL_CARI = 50

/** Tanpa `tab`, bawaannya Menunggu verifikasi bila ada isinya, kalau tidak Belum dibayar (keputusan 7D-2 butir 1). */
const filterSchema = z.object({
  tab: z.enum(TAB_TAGIHAN).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
})

/** Tagihan beserta desanya. Daftar tidak membawa isi berkas bukti (bisa besar); detail membawanya. */
function baris(db: DbDemo, t: Tagihan, denganBerkas: boolean): BarisTagihanKonsol {
  const desa = db.desa.find((d) => d.id === t.desaId)!
  const lepas = (b: Tagihan['bukti']) => (b && !denganBerkas ? { ...b, dataUrl: null } : b)
  return {
    ...t,
    bukti: lepas(t.bukti),
    riwayatBukti: t.riwayatBukti.map((b) => lepas(b)!),
    desa: { id: desa.id, nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama, alamatKantor: desa.alamatKantor },
  }
}

const cocokTab = (t: Tagihan, tab: TabTagihan, hariIni: string): boolean => tab === 'semua' || tabTagihan(t, hariIni) === tab

/** Menunggu: unggahan terlama dulu. Lewat: jatuh tempo terlama dulu. Selain itu: terbit terbaru dulu. */
function urutkan(daftar: Tagihan[], tab: TabTagihan): Tagihan[] {
  if (tab === 'menunggu') return daftar.sort((a, b) => (a.bukti?.diunggahPada ?? '').localeCompare(b.bukti?.diunggahPada ?? '') || a.id.localeCompare(b.id))
  if (tab === 'lewat') return daftar.sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo) || a.id.localeCompare(b.id))
  return daftar.sort((a, b) => b.terbit.localeCompare(a.terbit) || b.id.localeCompare(a.id))
}

function jumlahPerTab(semua: readonly Tagihan[], hariIni: string): Record<TabTagihan, number> {
  return Object.fromEntries(TAB_TAGIHAN.map((tab) => [tab, semua.filter((t) => cocokTab(t, tab, hariIni)).length])) as Record<TabTagihan, number>
}

type Pelaku = { id: string; nama: string }
type Rencana = {
  terap: (d: DbDemo, x: Tagihan, pada: string, pelaku: Pelaku) => void
  notif?: { aksi: AksiTagihanKonsol; isi: (x: Tagihan) => string }
}

/**
 * Aksi Tim Sinfodes atas satu tagihan. Urutan pemeriksaan sama dengan unggah bukti desa: 404, lalu 409 (dua tab yang bergantian
 * tidak melihat galat isian saat tagihannya sudah berubah), lalu validasi isian.
 */
async function aksi(
  request: Request,
  id: string,
  o: {
    dari: (t: Tagihan) => boolean
    pesanSalahStatus: string
    periksa: (isian: unknown, t: Tagihan, hariIni: string) => Rencana | { fields: Record<string, string> } | z.ZodError
  },
): Promise<Response> {
  const pengguna = butuhPenggunaKonsol(request)
  if (pengguna instanceof Response) return pengguna
  const isian = await bacaJson(request)
  const sekarang = new Date()
  const t = ambilDb().tagihan.find((x) => x.id === id)
  if (!t) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
  if (!o.dari(t)) return balasGalat('CONFLICT', o.pesanSalahStatus, 409)
  const hasil = o.periksa(isian, t, tanggalIsoWib(sekarang))
  if (hasil instanceof z.ZodError) return balasIsianTidakValid(hasil)
  if ('fields' in hasil) return balasGalat('VALIDATION', PESAN_ISIAN, 422, hasil.fields)
  const pada = waktuIsoWib(sekarang)
  const pelaku = { id: pengguna.id, nama: pengguna.nama }
  ubahDb((d) => {
    const x = d.tagihan.find((y) => y.id === id)!
    hasil.terap(d, x, pada, pelaku)
    if (hasil.notif) d.notifikasi.push(...notifikasiAksiTagihan(d, x, hasil.notif.aksi, hasil.notif.isi(x), pada))
  })
  const db = ambilDb()
  return HttpResponse.json(baris(db, db.tagihan.find((y) => y.id === id)!, true))
}

/**
 * Tagihan di Konsol (SPEC-V0.2 §10.4): daftar per tab, cari nominal, verifikasi bukti, kwitansi. Semuanya untuk Tim Sinfodes;
 * akun desa dan kabupaten dijawab 401. Setiap perubahan tercatat di `riwayat` tagihan dan memberi notifikasi ke desa.
 */
export const handlerKonsolTagihan = [
  http.get(
    `${API}/konsol/tagihan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const sekarang = new Date()
      pastikanTagihan(sekarang)
      const db = ambilDb()
      const hariIni = tanggalIsoWib(sekarang)
      const jumlah = jumlahPerTab(db.tagihan, hariIni)
      const tab = filter.data.tab ?? (jumlah.menunggu > 0 ? 'menunggu' : 'belum')
      const daftar = urutkan(db.tagihan.filter((t) => cocokTab(t, tab, hariIni)), tab)
      const { page, pageSize } = filter.data
      const hasil: DaftarTagihanKonsol = {
        data: daftar.slice((page - 1) * pageSize, page * pageSize).map((t) => baris(db, t, false)),
        meta: { page, pageSize, total: daftar.length },
        tab,
        jumlah,
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/konsol/tagihan/cari`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const parameter = new URL(request.url).searchParams
      const q = (parameter.get('q') ?? '').trim()
      const tab = z.enum(TAB_TAGIHAN).catch('semua').parse(parameter.get('tab') ?? 'semua')
      const sekarang = new Date()
      pastikanTagihan(sekarang)
      const db = ambilDb()
      if (q === '') return HttpResponse.json({ data: [] })
      const nominal = uraiNominal(q)
      const kata = q.toLowerCase()
      const hariIni = tanggalIsoWib(sekarang)
      // Nominal dicari di semua tab (mencocokkan mutasi rekening); nomor dan nama desa dalam tab yang aktif.
      const cocok = db.tagihan.filter((t) =>
        nominal !== null
          ? t.nominal === nominal
          : cocokTab(t, tab, hariIni) &&
            (t.nomor.toLowerCase().includes(kata) || db.desa.find((d) => d.id === t.desaId)!.nama.toLowerCase().includes(kata)),
      )
      return HttpResponse.json({ data: urutkan(cocok, 'semua').slice(0, MAKS_HASIL_CARI).map((t) => baris(db, t, false)) })
    }),
  ),
  http.get(
    `${API}/konsol/tagihan/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      pastikanTagihan(new Date())
      const db = ambilDb()
      const t = db.tagihan.find((x) => x.id === String(params.id))
      return t ? HttpResponse.json(baris(db, t, true)) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
  http.get(
    `${API}/konsol/tagihan/:id/kwitansi`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const t = db.tagihan.find((x) => x.id === String(params.id))
      const k = t ? kwitansiTagihan(db, t) : null
      return k ? HttpResponse.json(k) : balasGalat('NOT_FOUND', 'Kwitansi belum tersedia.', 404)
    }),
  ),
  http.post(
    `${API}/konsol/tagihan/:id/lunas`,
    denganJaringan(({ request, params }) =>
      aksi(request, String(params.id), {
        dari: (t) => t.status === 'menunggu-verifikasi',
        pesanSalahStatus: PESAN_TIDAK_MENUNGGU,
        periksa: (isian, t, hariIni) => {
          const h = lunasSchema.safeParse(isian)
          const fields: Record<string, string> = h.success ? {} : galatIsian(h.error)
          if (h.success && h.data.diterimaPada > hariIni) fields.diterimaPada = PESAN_DITERIMA_LEWAT
          else if (h.success && t.bukti && h.data.diterimaPada < t.bukti.tanggalTransfer) fields.diterimaPada = PESAN_DITERIMA_SEBELUM_TRANSFER
          if (!h.success || Object.keys(fields).length > 0) return { fields }
          return {
            terap: (d, x, pada, pelaku) => {
              x.status = 'lunas'
              x.lunas = { diterimaPada: h.data.diterimaPada, nominalDiterima: h.data.nominalDiterima, ditandaiPada: pada, olehNama: pelaku.nama }
              x.kwitansi = { nomor: nomorKwitansiBerikut(d, h.data.diterimaPada.slice(0, 4)), terbitPada: hariIni }
              x.riwayat.push({ status: 'lunas', pada, oleh: { jenis: 'konsol', ...pelaku }, catatan: null })
            },
            notif: { aksi: 'lunas', isi: (x) => `Kwitansi ${x.kwitansi!.nomor} sudah bisa diunduh.` },
          }
        },
      }),
    ),
  ),
  http.post(
    `${API}/konsol/tagihan/:id/tolak`,
    denganJaringan(({ request, params }) =>
      aksi(request, String(params.id), {
        dari: (t) => t.status === 'menunggu-verifikasi',
        pesanSalahStatus: PESAN_TIDAK_MENUNGGU,
        periksa: (isian) => {
          const h = alasanSchema.safeParse(isian)
          if (!h.success) return h.error
          return {
            terap: (_d, x, pada, pelaku) => {
              if (x.bukti) x.riwayatBukti.push(x.bukti)
              x.bukti = null
              x.status = 'terbit'
              x.penolakanTerakhir = { alasan: h.data.alasan, pada, olehNama: pelaku.nama }
              x.riwayat.push({ status: 'terbit', pada, oleh: { jenis: 'konsol', ...pelaku }, catatan: h.data.alasan })
            },
            notif: { aksi: 'ditolak', isi: () => h.data.alasan },
          }
        },
      }),
    ),
  ),
  http.post(
    `${API}/konsol/tagihan/:id/batalkan`,
    denganJaringan(({ request, params }) =>
      aksi(request, String(params.id), {
        dari: (t) => t.status === 'terbit' || t.status === 'menunggu-verifikasi',
        pesanSalahStatus: PESAN_TIDAK_BISA_BATAL,
        periksa: (isian) => {
          const h = alasanSchema.safeParse(isian)
          if (!h.success) return h.error
          return {
            terap: (_d, x, pada, pelaku) => {
              x.status = 'dibatalkan'
              x.dibatalkan = { alasan: h.data.alasan, pada, olehNama: pelaku.nama }
              x.riwayat.push({ status: 'dibatalkan', pada, oleh: { jenis: 'konsol', ...pelaku }, catatan: h.data.alasan })
            },
            notif: { aksi: 'dibatalkan', isi: () => h.data.alasan },
          }
        },
      }),
    ),
  ),
]
