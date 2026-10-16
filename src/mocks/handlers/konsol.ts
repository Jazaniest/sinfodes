import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { usulanAlamatDesa } from '@/domain/alamat/alamat'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { hitungPerhatian, statusTagihan } from '@/domain/konsol/aturan'
import { ringkasWilayah, type BarisPemantauanDesa, type Pemantauan } from '@/domain/konsol/pemantauan'
import {
  filterDesaKonsolSchema, tambahDesaSchema, undangSekdesSchema, type BarisDesaKonsol, type DetailDesaKonsol, type PenggunaKonsol,
  type RingkasanKonsol, type SesiKonsol,
} from '@/domain/konsol/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { katalogDesaBaru } from '@/domain/surat/bawaan'
import { KABUPATEN, wilayahKecamatan } from '@/domain/wilayah/kode-wilayah'
import { langkahBerikut } from '@/domain/wilayah/persiapan'
import type { Desa } from '@/domain/wilayah/schema'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { angkaKonsolDesa, type AngkaKonsol } from '../konsol-angka'
import { konteksPermintaan, tanpaKonteks } from '../konteks-permintaan'
import { butuhPenggunaKonsol, tokenKonsolUntuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, idBaru } from '../tulis'

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
    // Undangan dari Konsol hanya untuk desa berdata panel; desa contoh (rekaman) tidak punya akun sungguhan.
    bisaUndangSekdes: !db.rekamDesa.some((r) => r.desaId === desa.id) && a.kontak.sekdes === null,
    suratPerBulan: a.suratPerBulan, masukPerMinggu: a.masukPerMinggu,
    langganan: l ? { paket: l.paket, mulai: l.mulai, sampai: l.sampai, tagihan: l.tagihan } : { paket: 'Dasar', mulai: null, sampai: null, tagihan: [] },
  }
}

/** Satu desa di Pemantauan wilayah: hanya angka agregat (SPEC §11). */
const barisPemantauan = (desa: Desa, a: AngkaKonsol): BarisPemantauanDesa => ({
  id: desa.id, nama: desa.nama, status: desa.status, suratBulanIni: a.suratBulanIni, waktuLayananJam: a.waktuLayananJam, jiwa: a.jiwa,
  kelengkapan: a.kelengkapan, waktuTanggapanJam: a.waktuTanggapanJam, apbdes: a.apbdes,
})

const urutNama = (a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama, 'id')

/** Alamat yang sudah dipakai desa mana pun, termasuk alamat lama (alias) yang disimpan selamanya (SPEC-V0.2 §4.2). */
const alamatTerpakai = (db: DbDemo): Set<string> => new Set([...db.desa.map((d) => d.slug), ...db.aliasAlamat.map((a) => a.label)])

/** Konsol Sinfodes (SPEC §11). Akun konsol terpisah dari akun panel desa. */
export const handlerKonsol = [
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
      const slug = usulanAlamatDesa({ nama, kecamatan: wilayah.kecamatan.nama, kabupaten: wilayah.kabupaten.nama }, alamatTerpakai(db))
      if (!slug) return balasField('nama', 'Alamat untuk desa ini sudah terpakai.', 'CONFLICT')
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
        d.langganan.push({ desaId: id, paket, mulai: null, sampai: null, tagihan: [] })
        // Katalog bawaan, semuanya belum dilayani: desa memilihnya di langkah persiapan terakhir (tahap 6C).
        d.jenisSurat.push(...katalogDesaBaru(desa))
      })
      return HttpResponse.json({ id, nama, email }, { status: 201 })
    }),
  ),
  http.post(
    `${API}/konsol/desa/:id/sekdes`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const ditolak = tolakPemantau(pengguna)
      if (ditolak) return ditolak
      const db = ambilDb()
      const desa = db.desa.find((d) => d.id === String(params.id))
      if (!desa) return balasGalat('NOT_FOUND', 'Desa tidak ditemukan.', 404)
      if (db.rekamDesa.some((r) => r.desaId === desa.id)) return balasGalat('CONFLICT', 'Akun desa contoh tidak bisa diubah di demo.', 409)
      const isian = undangSekdesSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const ada = db.pengguna.find((p) => p.desaId === desa.id && p.peran === 'sekdes' && p.aktif)
      if (ada) return balasGalat('CONFLICT', `Desa ini sudah punya Sekretaris Desa aktif: ${ada.nama}.`, 409)
      const { nama, email } = isian.data
      if ([...db.pengguna, ...db.penggunaKonsol].some((p) => p.email.toLowerCase() === email)) {
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
  http.get(
    `${API}/konsol/pemantauan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPenggunaKonsol(request)
      if (pengguna instanceof Response) return pengguna
      const diminta = new URL(request.url).searchParams.get('wilayah')
      // Pemantau selalu dibatasi ke wilayahnya; meminta wilayah lain berarti mencoba melihat yang bukan haknya (fokus review 1).
      if (pengguna.wilayah && diminta !== null && diminta !== pengguna.wilayah.kode) {
        return balasGalat('FORBIDDEN', 'Pemantau hanya membuka wilayahnya sendiri.', 403)
      }
      const kode = pengguna.wilayah?.kode ?? diminta
      if (!kode) return balasField('wilayah', 'Pilih kabupaten.')
      const nama = /^\d{2}\.\d{2}$/.test(kode) ? (KABUPATEN[kode.replace('.', '')] as string | undefined) : undefined
      if (!nama) return balasField('wilayah', 'Kabupaten tidak dikenal.')
      const db = ambilDb()
      const sekarang = new Date()
      const perKecamatan = new Map<string, { kecamatan: Desa['kecamatan']; desa: BarisPemantauanDesa[] }>()
      for (const d of db.desa.filter((x) => x.kabupaten.kode === kode)) {
        const k = perKecamatan.get(d.kecamatan.kode) ?? { kecamatan: d.kecamatan, desa: [] }
        k.desa.push(barisPemantauan(d, angkaKonsolDesa(db, d, sekarang)))
        perKecamatan.set(d.kecamatan.kode, k)
      }
      const kecamatan = [...perKecamatan.values()].sort((a, b) => urutNama(a.kecamatan, b.kecamatan))
      const hasil: Pemantauan = {
        wilayah: { kode, nama },
        bulan: tanggalIsoWib(sekarang).slice(0, 7),
        total: ringkasWilayah(kecamatan.flatMap((k) => k.desa)),
        kecamatan: kecamatan.map((k) => ({ kecamatan: k.kecamatan, ...ringkasWilayah(k.desa), desa: [...k.desa].sort(urutNama) })),
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
