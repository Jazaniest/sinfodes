import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { labelAlamatSah, PESAN_ALAMAT_TIDAK_SAH, usulanAlamatDesa } from '@/domain/alamat/alamat'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { hitungPerhatian } from '@/domain/konsol/aturan'
import { lewatJatuhTempo } from '@/domain/langganan/tagihan'
import {
  filterDesaKonsolSchema, tambahDesaSchema, ubahAlamatSchema, undangSekdesSchema, type BarisDesaKonsol, type DetailDesaKonsol,
  type PeriksaAlamat,
  type RingkasanKonsol, type SesiKonsol,
} from '@/domain/konsol/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { katalogDesaBaru } from '@/domain/surat/bawaan'
import { wilayahKecamatan } from '@/domain/wilayah/kode-wilayah'
import { langkahBerikut } from '@/domain/wilayah/persiapan'
import type { Desa } from '@/domain/wilayah/schema'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { masihBerlaku, UMUR_TIKET_MS } from '../bantuan'
import { ambilDb, simpanSekarang, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { angkaKonsolDesa, type AngkaKonsol } from '../konsol-angka'
import { konteksPermintaan, tanpaKonteks } from '../konteks-permintaan'
import { butuhPenggunaKonsol, tokenKonsolUntuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, emailTerpakai, idBaru } from '../tulis'

const masukSchema = z.object({ email: z.string().trim().toLowerCase().min(1), kataSandi: z.string().min(1) })

function barisDesa(db: DbDemo, desa: Desa, a: AngkaKonsol): BarisDesaKonsol {
  return {
    id: desa.id, slug: desa.slug, nama: desa.nama, kodeDesa: desa.kodeDesa, kecamatan: desa.kecamatan, kabupaten: desa.kabupaten,
    provinsi: desa.provinsi, status: desa.status, paket: db.langganan.find((l) => l.desaId === desa.id)?.paket ?? 'Dasar',
    penggunaAktif: a.penggunaAktif, aktivitasTerakhir: a.aktivitasTerakhir,
  }
}

function detailDesa(db: DbDemo, desa: Desa, sekarang: Date): DetailDesaKonsol {
  const a = angkaKonsolDesa(db, desa, sekarang)
  const l = db.langganan.find((x) => x.desaId === desa.id)
  const bantuan = db.aksesBantuan.find((x) => x.desaId === desa.id && masihBerlaku(x, sekarang))
  return {
    ...barisDesa(db, desa, a),
    alamatKantor: desa.alamatKantor, surel: desa.surel, telepon: desa.telepon, kontak: a.kontak, persiapan: a.persiapan,
    // Undangan dari Konsol hanya untuk desa berdata panel; desa contoh (rekaman) tidak punya akun sungguhan.
    bisaUndangSekdes: !db.rekamDesa.some((r) => r.desaId === desa.id) && a.kontak.sekdes === null,
    aliasAlamat: db.aliasAlamat.filter((x) => x.desaId === desa.id).map((x) => x.label),
    penyimpananKb: a.penyimpananKb, masukPerMinggu: a.masukPerMinggu,
    aksesBantuan: bantuan ? { sampai: bantuan.sampai, sembunyikanDataPribadi: bantuan.sembunyikanDataPribadi } : null,
    langganan: l ? { paket: l.paket, periodeTagihan: l.periodeTagihan, mulai: l.mulai, sampai: l.sampai } : { paket: 'Dasar', periodeTagihan: 'triwulan', mulai: null, sampai: null },
    tagihan: db.tagihan.filter((t) => t.desaId === desa.id).sort((a, b) => a.periode.mulai.localeCompare(b.periode.mulai) || a.id.localeCompare(b.id)),
  }
}


/** Alamat yang sudah dipakai desa mana pun, termasuk alamat lama (alias) yang disimpan selamanya (SPEC-V0.2 §4.2). */
const alamatTerpakai = (db: DbDemo): Set<string> => new Set([...db.desa.map((d) => d.slug), ...db.aliasAlamat.map((a) => a.label)])

/**
 * Bisakah `label` dipakai desa `desaId` (undefined untuk desa baru)? Alias milik desa itu sendiri boleh dipakai lagi; alamat
 * dan alias desa lain tidak pernah (SPEC-V0.2 §4.2).
 */
export function periksaLabelAlamat(db: DbDemo, label: string, desaId: string | undefined): PeriksaAlamat {
  if (!labelAlamatSah(label)) return { status: 'tidak-sah', pesan: PESAN_ALAMAT_TIDAK_SAH }
  if (desaId !== undefined && db.desa.find((d) => d.id === desaId)?.slug === label) return { status: 'sekarang', pesan: 'Ini alamat desa sekarang.' }
  const pemilik = db.desa.find((d) => d.slug === label)?.id ?? db.aliasAlamat.find((a) => a.label === label)?.desaId
  if (pemilik !== undefined && pemilik !== desaId) return { status: 'dipakai', pesan: 'Alamat ini sudah dipakai desa lain.' }
  return { status: 'tersedia', pesan: 'Alamat ini bisa dipakai.' }
}

/** Konsol Sinfodes (SPEC §11). Akun konsol terpisah dari akun panel desa. */
export const handlerKonsol = [
  http.get(
    `${API}/konsol/alamat-desa`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const q = new URL(request.url).searchParams
      const nama = (q.get('nama') ?? '').trim()
      const wilayah = wilayahKecamatan(q.get('kecamatan') ?? '')
      if (!nama || !wilayah) return HttpResponse.json({ usulan: null })
      const w = { nama, kecamatan: wilayah.kecamatan.nama, kabupaten: wilayah.kabupaten.nama }
      return HttpResponse.json({ usulan: usulanAlamatDesa(w, alamatTerpakai(ambilDb())) })
    }),
  ),
  http.get(
    `${API}/konsol/alamat-desa/periksa`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const q = new URL(request.url).searchParams
      const label = (q.get('label') ?? '').trim().toLowerCase()
      return HttpResponse.json(periksaLabelAlamat(ambilDb(), label, q.get('desaId') ?? undefined))
    }),
  ),
  http.post(
    `${API}/konsol/sesi/masuk`,
    denganJaringan(async ({ request }) => {
      // Konsol hanya dibuka dari alamatnya sendiri (SPEC-V0.2 §4.1).
      const k = konteksPermintaan(request)
      if (!tanpaKonteks(k) && k.jenis !== 'konsol') return balasGalat('NOT_FOUND', 'Konsol tidak ada di alamat ini.', 404)
      const isian = masukSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasGalat('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
      const akun = ambilDb().penggunaKonsol.find((p) => p.email === isian.data.email)
      if (!akun || isian.data.kataSandi !== KATA_SANDI_DEMO) {
        return balasGalat('VALIDATION', 'Email atau kata sandi salah.', 422, { kataSandi: 'Email atau kata sandi salah.' })
      }
      const sesi: SesiKonsol = { jenis: 'konsol', pengguna: akun }
      return HttpResponse.json({ token: tokenKonsolUntuk(akun.id), sesi })
    }),
  ),
  http.get(
    `${API}/konsol/sesi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const sesi: SesiKonsol = { jenis: 'konsol', pengguna }
      return HttpResponse.json(sesi)
    }),
  ),
  http.post(
    `${API}/konsol/sesi/keluar`,
    denganJaringan(() => new HttpResponse(null, { status: 204 })),
  ),
  http.get(
    `${API}/konsol/ringkasan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const sekarang = new Date()
      const desa = db.desa.map((d) => ({ d, a: angkaKonsolDesa(db, d, sekarang) }))
      const hariIni = tanggalIsoWib(sekarang)
      const tagihanLewat = db.tagihan.filter((t) => lewatJatuhTempo(t, hariIni)).length
      const jumlah = (s: Desa['status']) => desa.filter(({ d }) => d.status === s).length
      const hasil: RingkasanKonsol = {
        perhatian: hitungPerhatian(
          desa.map(({ d, a }) => ({ status: d.status, aktivitasTerakhir: a.aktivitasTerakhir, langkahBerikut: langkahBerikut(a.persiapan) })),
          tagihanLewat,
          sekarang,
        ),
        desa: { aktif: jumlah('Aktif'), ujiCoba: jumlah('Uji coba'), persiapan: jumlah('Persiapan'), ditangguhkan: jumlah('Ditangguhkan') },
        kabupatenMitra: db.kabupatenMitra.length,
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/konsol/desa`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterDesaKonsolSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const f = filter.data
      const db = ambilDb()
      const sekarang = new Date()
      const daftar = db.desa
        .filter(
          (d) =>
            (f.provinsi === undefined || d.provinsi.kode === f.provinsi) &&
            (f.kabupaten === undefined || d.kabupaten.kode === f.kabupaten) &&
            (f.status === undefined || d.status === f.status),
        )
        .map((d) => barisDesa(db, d, angkaKonsolDesa(db, d, sekarang)))
        .filter((b) => f.paket === undefined || b.paket === f.paket)
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1))
    }),
  ),
  http.get(
    `${API}/konsol/desa/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      return HttpResponse.json(detailDesa(db, desa, new Date()))
    }),
  ),
  http.post(
    `${API}/konsol/desa`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const isian = tambahDesaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { nama, kecamatan, kodeDesa, paket, email, alamat } = isian.data
      const wilayah = wilayahKecamatan(kecamatan)
      if (!wilayah) return balasField('kecamatan', 'Kecamatan tidak dikenal.')
      const db = ambilDb()
      const kodeLengkap = `${kecamatan}.${kodeDesa}`
      if (db.desa.some((d) => d.kodeDesa === kodeLengkap)) return balasField('kodeDesa', `Kode desa ${kodeLengkap} sudah terdaftar.`, 'CONFLICT')
      if (emailTerpakai(db, email)) {
        return balasField('email', 'Email ini sudah dipakai akun lain.', 'CONFLICT')
      }
      if (periksaLabelAlamat(db, alamat, undefined).status !== 'tersedia') return balasField('alamat', 'Alamat ini sudah dipakai desa lain.', 'CONFLICT')
      const slug = alamat
      const id = `desa_${slug.replaceAll('-', '_')}`
      const desa: Desa = {
        id, slug, nama, kodeDesa: kodeLengkap, kecamatan: wilayah.kecamatan, kabupaten: wilayah.kabupaten, provinsi: wilayah.provinsi,
        kodePos: '', alamatKantor: '', surel: '', telepon: '', jamLayanan: [], luasKm2: null, batas: null,
        istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
        kodeSurat: nama.split(' ').map((k) => k[0]).join('').toUpperCase(),
        status: 'Persiapan',
      }
      // Admin pertama berperan Sekretaris Desa: hanya peran ini yang bisa menambah pengguna (SPEC §5.1), dan ia juga berhak
      // atas empat langkah persiapan lainnya. Di demo undangan langsung aktif dengan kata sandi demo, sama dengan undangan di
      // Pengaturan › Pengguna (tahap 6C).
      const admin: Pengguna = {
        id: `pgn_${slug.replaceAll('-', '_')}_admin`, desaId: id, nama: 'Admin desa', jabatan: 'Sekretaris Desa', peran: 'sekdes',
        dusunId: null, email, aktif: true,
      }
      ubahDb((d) => {
        d.desa.push(desa)
        d.pengguna.push(admin)
        d.langganan.push({ desaId: id, paket, periodeTagihan: 'triwulan', mulai: null, sampai: null })
        // Katalog bawaan, semuanya belum dilayani: desa memilihnya di langkah persiapan terakhir (tahap 6C).
        d.jenisSurat.push(...katalogDesaBaru(desa))
      })
      return HttpResponse.json({ id, nama, email }, { status: 201 })
    }),
  ),
  http.put(
    `${API}/konsol/desa/:id/alamat`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      const isian = ubahAlamatSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { alamat } = isian.data
      const periksa = periksaLabelAlamat(db, alamat, desa.id)
      if (periksa.status === 'sekarang') return balasField('alamat', 'Alamat baru sama dengan alamat sekarang.')
      if (periksa.status !== 'tersedia') return balasField('alamat', periksa.pesan, 'CONFLICT')
      // Alamat lama jadi alias selamanya supaya tautan dan QR surat lama tetap sampai; alias milik sendiri yang dipakai lagi
      // keluar dari daftar alias (SPEC-V0.2 §4.2).
      const lama = desa.slug
      ubahDb((d) => {
        d.aliasAlamat = [...d.aliasAlamat.filter((a) => a.label !== alamat), { label: lama, desaId: desa.id }]
        desa.slug = alamat
      })
      return HttpResponse.json({ slug: alamat, aliasAlamat: db.aliasAlamat.filter((a) => a.desaId === desa.id).map((a) => a.label) })
    }),
  ),
  http.post(
    `${API}/konsol/desa/:id/tiket-bantuan`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      const sekarang = new Date()
      const akses = db.aksesBantuan.find((a) => a.desaId === desa.id && masihBerlaku(a, sekarang))
      if (!akses) return balasGalat('CONFLICT', 'Desa belum memberi akses bantuan.', 409)
      const kode = crypto.randomUUID()
      ubahDb((d) => {
        const a = d.aksesBantuan.find((x) => x.id === akses.id)
        if (a) {
          a.tiket = { kode, berlakuSampai: waktuIsoWib(new Date(sekarang.getTime() + UMUR_TIKET_MS)), olehId: pengguna.id, olehNama: pengguna.nama }
        }
      })
      // Tiket ditukar di alamat desa, yang membaca data dari penyimpanan bersama: simpan sebelum Konsol berpindah halaman.
      await simpanSekarang()
      return HttpResponse.json({ tiket: kode, alamat: desa.slug })
    }),
  ),
  http.post(
    `${API}/konsol/desa/:id/sekdes`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      if (db.rekamDesa.some((r) => r.desaId === desa.id)) return balasGalat('CONFLICT', 'Akun desa contoh tidak bisa diubah di demo.', 409)
      const isian = undangSekdesSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const ada = db.pengguna.find((p) => p.desaId === desa.id && p.peran === 'sekdes' && p.aktif)
      if (ada) return balasGalat('CONFLICT', `Desa ini sudah punya Sekretaris Desa aktif: ${ada.nama}.`, 409)
      const { nama, email } = isian.data
      if (emailTerpakai(db, email)) {
        return balasField('email', 'Email ini sudah dipakai akun lain.', 'CONFLICT')
      }
      // Di demo undangan langsung aktif dengan kata sandi demo, sama dengan undangan di Pengaturan › Pengguna (tahap 6C).
      const baru: Pengguna = { id: idBaru(db, 'pgn'), desaId: desa.id, nama, jabatan: 'Sekretaris Desa', peran: 'sekdes', dusunId: null, email, aktif: true }
      ubahDb((d) => {
        d.pengguna.push(baru)
      })
      return HttpResponse.json({ nama, email }, { status: 201 })
    }),
  ),
]
