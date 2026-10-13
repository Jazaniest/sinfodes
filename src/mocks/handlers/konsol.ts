import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { hitungPerhatian, slugDesa, statusTagihan } from '@/domain/konsol/aturan'
import {
  filterDesaKonsolSchema, tambahDesaSchema, type BarisDesaKonsol, type DetailDesaKonsol, type PenggunaKonsol, type RingkasanKonsol,
  type SesiKonsol,
} from '@/domain/konsol/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { wilayahKecamatan } from '@/domain/wilayah/kode-wilayah'
import { langkahBerikut } from '@/domain/wilayah/persiapan'
import type { Desa } from '@/domain/wilayah/schema'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { angkaKonsolDesa, type AngkaKonsol } from '../konsol-angka'
import { butuhPenggunaKonsol, tokenKonsolUntuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid } from '../tulis'

const masukSchema = z.object({ email: z.string().trim().toLowerCase().min(1), kataSandi: z.string().min(1) })

/** Desa dalam cakupan akun: semua untuk Tim Sinfodes; kabupatennya saja untuk pemantau (SPEC §11). */
const desaCakupan = (db: DbDemo, p: PenggunaKonsol): Desa[] =>
  db.desa.filter((d) => p.wilayah === null || d.kabupaten.kode === p.wilayah.kode)

/** Endpoint Desa khusus Tim Sinfodes; pemantau hanya melihat angka agregat (fokus review 1). */
const tolakPemantau = (p: PenggunaKonsol): Response | null =>
  p.peran === 'tim' ? null : balasGalat('FORBIDDEN', 'Pemantau wilayah hanya membuka Ringkasan dan Pemantauan.', 403)

function barisDesa(db: DbDemo, desa: Desa, a: AngkaKonsol): BarisDesaKonsol {
  return {
    id: desa.id, slug: desa.slug, nama: desa.nama, kodeDesa: desa.kodeDesa, kecamatan: desa.kecamatan, kabupaten: desa.kabupaten,
    provinsi: desa.provinsi, status: desa.status, paket: db.langganan.find((l) => l.desaId === desa.id)?.paket ?? 'Dasar',
    penggunaAktif: a.penggunaAktif, aktivitasTerakhir: a.aktivitasTerakhir, kelengkapan: a.kelengkapan,
  }
}

function detailDesa(db: DbDemo, desa: Desa, sekarang: Date): DetailDesaKonsol {
  const a = angkaKonsolDesa(db, desa, sekarang)
  const l = db.langganan.find((x) => x.desaId === desa.id)
  return {
    ...barisDesa(db, desa, a),
    alamatKantor: desa.alamatKantor, surel: desa.surel, telepon: desa.telepon, kontak: a.kontak, jiwa: a.jiwa, persiapan: a.persiapan,
    suratPerBulan: a.suratPerBulan, masukPerMinggu: a.masukPerMinggu,
    langganan: l ? { paket: l.paket, mulai: l.mulai, sampai: l.sampai, tagihan: l.tagihan } : { paket: 'Dasar', mulai: null, sampai: null, tagihan: [] },
  }
}

/** Slug yang belum dipakai: "sungai-sialang", lalu "sungai-sialang-2", dan seterusnya. */
function slugBaru(db: DbDemo, nama: string): string {
  const dasar = slugDesa(nama)
  let slug = dasar
  for (let n = 2; db.desa.some((d) => d.slug === slug); n++) slug = `${dasar}-${n}`
  return slug
}

/** Konsol Sinfodes (SPEC §11). Akun konsol terpisah dari akun panel desa. */
export const handlerKonsol = [
  http.post(
    `${API}/konsol/sesi/masuk`,
    denganJaringan(async ({ request }) => {
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
      const desa = desaCakupan(db, pengguna).map((d) => ({ d, a: angkaKonsolDesa(db, d, sekarang) }))
      const hariIni = tanggalIsoWib(sekarang)
      const tagihanLewat =
        pengguna.peran === 'tim'
          ? db.langganan.flatMap((l) => l.tagihan).filter((t) => statusTagihan(t, hariIni) === 'lewat-jatuh-tempo').length
          : null
      const jumlah = (s: Desa['status']) => desa.filter(({ d }) => d.status === s).length
      const hasil: RingkasanKonsol = {
        cakupan: pengguna.wilayah ? `Kabupaten ${pengguna.wilayah.nama}` : 'Semua desa',
        perhatian: hitungPerhatian(
          desa.map(({ d, a }) => ({ status: d.status, aktivitasTerakhir: a.aktivitasTerakhir, langkahBerikut: langkahBerikut(a.persiapan) })),
          tagihanLewat,
          sekarang,
        ),
        desa: { aktif: jumlah('Aktif'), ujiCoba: jumlah('Uji coba'), persiapan: jumlah('Persiapan'), ditangguhkan: jumlah('Ditangguhkan') },
        suratMingguIni: desa.reduce((n, { a }) => n + a.suratMingguIni, 0),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/konsol/desa`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const ditolak = tolakPemantau(pengguna)
      if (ditolak) return ditolak
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
      const ditolak = tolakPemantau(pengguna)
      if (ditolak) return ditolak
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
      const ditolak = tolakPemantau(pengguna)
      if (ditolak) return ditolak
      const isian = tambahDesaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const { nama, kecamatan, kodeDesa, paket, email } = isian.data
      const wilayah = wilayahKecamatan(kecamatan)
      if (!wilayah) return balasField('kecamatan', 'Kecamatan tidak dikenal.')
      const db = ambilDb()
      const kodeLengkap = `${kecamatan}.${kodeDesa}`
      if (db.desa.some((d) => d.kodeDesa === kodeLengkap)) return balasField('kodeDesa', `Kode desa ${kodeLengkap} sudah terdaftar.`, 'CONFLICT')
      if ([...db.pengguna, ...db.penggunaKonsol].some((p) => p.email.toLowerCase() === email)) {
        return balasField('email', 'Email ini sudah dipakai akun lain.', 'CONFLICT')
      }
      const slug = slugBaru(db, nama)
      const id = `desa_${slug.replaceAll('-', '_')}`
      const desa: Desa = {
        id, slug, nama, kodeDesa: kodeLengkap, kecamatan: wilayah.kecamatan, kabupaten: wilayah.kabupaten, provinsi: wilayah.provinsi,
        kodePos: '', alamatKantor: '', surel: '', telepon: '', jamLayanan: [], luasKm2: null, batas: null,
        istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
        kodeSurat: nama.split(' ').map((k) => k[0]).join('').toUpperCase(),
        status: 'Persiapan',
      }
      // Akun admin pertama menunggu undangannya diterima (undangan tiruan), jadi belum bisa masuk.
      const admin: Pengguna = {
        id: `pgn_${slug.replaceAll('-', '_')}_admin`, desaId: id, nama: 'Admin desa', jabatan: 'Operator Desa', peran: 'operator',
        dusunId: null, email, aktif: false,
      }
      ubahDb((d) => {
        d.desa.push(desa)
        d.pengguna.push(admin)
        d.langganan.push({ desaId: id, paket, mulai: null, sampai: null, tagihan: [] })
      })
      return HttpResponse.json({ id, nama, email }, { status: 201 })
    }),
  ),
]
