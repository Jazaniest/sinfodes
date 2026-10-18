import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { jadwalBerikut, teksJadwal } from '@/domain/kesehatan/schema'
import { jumlahKelompok } from '@/domain/keuangan/schema'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import {
  agendaPublikSchema, pengumumanPublikSchema, verifikasiMasukanSchema, type AngkaDesa, type ArtikelPublik, type BerandaPublik,
  type FotoPublik, type HasilVerifikasi, type IdentitasPublik, type KreditFotoPublik, type LayananPublik, type RingkasArtikel,
} from '@/domain/publik/schema'
import { hitungBerlaku, kodeSah, rapikanKode, samarkanNama } from '@/domain/publik/verifikasi'
import { statusPengumuman, type Artikel, type Potensi } from '@/domain/website/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import type { Desa } from '@/domain/wilayah/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { desaKonteks, konteksPermintaan, tanpaKonteks } from '../konteks-permintaan'
import { perkiraanHariKerja } from '../surat-perkiraan'
import type { DbDemo } from '../tipe-db'
import { bacaJson } from '../tulis'
import { apbdesTerbaru } from './keuangan'
import { tampilanDesa } from './website'

/**
 * Website tayang untuk desa yang sudah berjalan, termasuk yang Ditangguhkan, sehingga cek keaslian suratnya selalu jalan. Desa
 * Persiapan belum punya website (SPEC-V0.2 §4.1).
 */
const desaPublik = (db: DbDemo, slug: string): Desa | undefined => db.desa.find((d) => d.slug === slug && d.status !== 'Persiapan')

/**
 * Desa dari parameter `:slug`, atau balasan NOT_FOUND. Dipakai juga handler verifikasi. Di alamat desa, slug harus milik
 * desa alamat itu: website desa lain tidak bisa dibaca lewat alamat desa ini (SPEC-V0.2 §4.5).
 */
export function cariDesaPublik(slug: unknown, request: Request): { db: DbDemo; desa: Desa } | Response {
  const db = ambilDb()
  const k = konteksPermintaan(request)
  const desa = desaPublik(db, String(slug))
  const sesuai = tanpaKonteks(k) || (desa !== undefined && desaKonteks(db, k)?.id === desa.id)
  return desa && sesuai ? { db, desa } : balasGalat('NOT_FOUND', 'Website desa tidak ditemukan.', 404)
}

function identitas(db: DbDemo, d: Desa): IdentitasPublik {
  const t = tampilanDesa(db, d.id)
  return {
    slug: d.slug, nama: d.nama, kecamatan: d.kecamatan, kabupaten: d.kabupaten, provinsi: d.provinsi, alamatKantor: d.alamatKantor,
    kodePos: d.kodePos, surel: d.surel, telepon: d.telepon, jamLayanan: d.jamLayanan, luasKm2: d.luasKm2,
    aksen: t.aksen, motif: t.motif, logo: t.logo ?? d.lambang ?? null,
  }
}

/** Foto kurasi dari galeri beserta keterangan dan kreditnya; null bila berkasnya belum tersedia. */
export function fotoDari(db: DbDemo, desaId: string, berkas: string | null): FotoPublik | null {
  const f = berkas ? db.galeri.find((x) => x.desaId === desaId && x.berkas === berkas && x.tersedia) : undefined
  if (!f) return null
  return { berkas: f.berkas, keterangan: f.judul, kredit: f.kredit ? `${f.kredit.pembuat} · ${f.kredit.lisensi}` : null }
}

/** Sampul Tampilan website: foto kurasi berkredit, atau unggahan desa (data URL) tanpa kredit. */
function sampulDari(db: DbDemo, d: Desa): FotoPublik | null {
  const sampul = tampilanDesa(db, d.id).sampul
  if (!sampul) return null
  return fotoDari(db, d.id, sampul) ?? { berkas: sampul, keterangan: `Desa ${d.nama}`, kredit: null }
}

const ringkas = (db: DbDemo, a: Artikel): RingkasArtikel => ({
  slug: a.slug, judul: a.judul, kategori: a.kategori, tanggal: a.tanggal, ringkasan: a.ringkasan, foto: fotoDari(db, a.desaId, a.foto),
})

/** Artikel yang sudah terbit, terbaru dulu. Draf tidak pernah tampil di website. */
const terbit = (db: DbDemo, desaId: string): Artikel[] =>
  db.artikel.filter((a) => a.desaId === desaId && a.status === 'terbit').sort((a, b) => b.tanggal.localeCompare(a.tanggal))

/** Potensi desa urut tampil (SPEC §9). */
export const potensiDesa = (db: DbDemo, desaId: string): Potensi[] =>
  db.potensi.filter((p) => p.desaId === desaId).sort((a, b) => a.urutan - b.urutan)

/** KK yang masih punya anggota, sama dengan hitungan panel admin (cakupan.ts), supaya angka website dan panel sama. */
export const jumlahKkAktif = (db: DbDemo, desaId: string): number =>
  db.keluarga.filter((k) => k.desaId === desaId && k.anggotaIds.length > 0).length

function angkaDesa(db: DbDemo, d: Desa): AngkaDesa {
  const dusun = db.dusun.filter((x) => x.desaId === d.id)
  return {
    jiwa: db.penduduk.filter((p) => p.desaId === d.id && p.statusDasar === 'Hidup').length,
    kk: jumlahKkAktif(db, d.id),
    dusun: dusun.length,
    rt: dusun.reduce((n, x) => n + x.rw.reduce((m, rw) => m + rw.rt.length, 0), 0),
    luasKm2: d.luasKm2,
  }
}

const MENIT_MS = 60_000
/** Pengaman verifikasi (SPEC §3.4, fokus review 3): 10 kode salah dalam 10 menit mengunci verifikasi desa itu 10 menit. */
export const BATAS_VERIFIKASI = { gagal: 10, jendelaMs: 10 * MENIT_MS, kunciMs: 10 * MENIT_MS } as const
const PESAN_TERKUNCI = 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.'
const PESAN_FORMAT = 'Kode verifikasi berbentuk seperti SS-7K3M-Q9TD.'

function terkunci(db: DbDemo, desaId: string, sekarang: Date): boolean {
  const c = db.percobaanVerifikasi.find((x) => x.desaId === desaId)
  return c !== undefined && c.terkunciSampai !== null && new Date(c.terkunciSampai).getTime() > sekarang.getTime()
}

/** Catat satu kode yang tidak ditemukan. Mengembalikan true bila kode ini membuat verifikasi dikunci. */
function catatKodeSalah(desaId: string, sekarang: Date): boolean {
  let dikunci = false
  ubahDb((d) => {
    let c = d.percobaanVerifikasi.find((x) => x.desaId === desaId)
    if (!c) {
      c = { desaId, gagal: [], terkunciSampai: null }
      d.percobaanVerifikasi.push(c)
    }
    const batas = sekarang.getTime() - BATAS_VERIFIKASI.jendelaMs
    c.gagal = [...c.gagal.filter((w) => new Date(w).getTime() > batas), waktuIsoWib(sekarang)]
    if (c.gagal.length >= BATAS_VERIFIKASI.gagal) {
      c.terkunciSampai = waktuIsoWib(new Date(sekarang.getTime() + BATAS_VERIFIKASI.kunciMs))
      c.gagal = []
      dikunci = true
    }
  })
  return dikunci
}

/** Website publik desa (SPEC §9). Tanpa sesi: data dibatasi ke desa dari `:slug`. */
export const handlerPublik = [
  http.get(
    `${API}/publik/:slug`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      return HttpResponse.json(identitas(c.db, c.desa))
    }),
  ),
  http.get(
    `${API}/publik/:slug/beranda`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const hariIni = tanggalIsoWib(new Date())
      const daftar = terbit(db, desa.id)
      const apbdes = apbdesTerbaru(desa.id)
      // Berita utama: kabar terbaru yang berfoto (SPEC §9: foto besar dengan keterangan).
      const utama = daftar.find((a) => a.foto !== null) ?? daftar.at(0) ?? null
      const hasil: BerandaPublik = {
        utama: utama ? ringkas(db, utama) : null,
        terbaru: daftar
          .filter((a) => a !== utama)
          .slice(0, 4)
          .map((a) => ringkas(db, a)),
        pengumuman: db.pengumuman
          .filter((p) => p.desaId === desa.id && statusPengumuman(p, hariIni) === 'berlaku')
          .sort((a, b) => b.mulai.localeCompare(a.mulai))
          .map((p) => pengumumanPublikSchema.parse(p)),
        agenda: db.agenda
          .filter((a) => a.desaId === desa.id && a.tanggal >= hariIni)
          .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.mulai.localeCompare(b.mulai))
          .slice(0, 5)
          .map((a) => agendaPublikSchema.parse(a)),
        angka: angkaDesa(db, desa),
        sampul: sampulDari(db, desa),
        apbdes: apbdes
          ? { tahun: apbdes.tahun, pendapatan: jumlahKelompok(apbdes, 'pendapatan'), belanja: jumlahKelompok(apbdes, 'belanja') }
          : null,
        potensi: potensiDesa(db, desa.id).map((p) => ({ id: p.id, judul: p.judul, kategori: p.kategori, foto: fotoDari(db, desa.id, p.foto) })),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/publik/:slug/kabar`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const kategori = new URL(request.url).searchParams.get('kategori')
      const daftar = terbit(c.db, c.desa.id).filter((a) => !kategori || a.kategori === kategori)
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1), (a) => ringkas(c.db, a))
    }),
  ),
  http.get(
    `${API}/publik/:slug/kabar/:artikel`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const a = terbit(c.db, c.desa.id).find((x) => x.slug === String(params.artikel))
      if (!a) return balasGalat('NOT_FOUND', 'Kabar tidak ditemukan.', 404)
      const hasil: ArtikelPublik = { ...ringkas(c.db, a), penulis: a.penulis, isi: a.isi }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/publik/:slug/layanan`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const sekarang = new Date()
      const hariIni = tanggalIsoWib(sekarang)
      const hasil: LayananPublik = {
        jenisSurat: db.jenisSurat
          .filter((j) => j.desaId === desa.id && j.online && j.aktif)
          .map((j) => ({ id: j.id, kode: j.kode, nama: j.nama, syarat: j.syarat, perkiraanHariKerja: perkiraanHariKerja(db, j.id, sekarang) })),
        posyandu: db.posyandu
          .filter((p) => p.desaId === desa.id)
          .map((p) => ({ p, dusun: db.dusun.find((d) => d.id === p.dusunId) }))
          .sort((a, b) => (a.dusun?.nomor ?? 0) - (b.dusun?.nomor ?? 0))
          .map(({ p, dusun }) => ({
            nama: p.nama, dusun: dusun ? namaDusun(dusun, desa.istilahWilayah) : '', tempat: p.tempat, jadwal: jadwalBerikut(p.jadwal, hariIni), aturan: teksJadwal(p.jadwal),
          })),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/publik/:slug/kredit-foto`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const hasil: KreditFotoPublik[] = c.db.galeri.flatMap((f) =>
        f.desaId === c.desa.id && f.tersedia && f.kredit ? [{ berkas: f.berkas, keterangan: f.judul, ...f.kredit }] : [],
      )
      return HttpResponse.json(hasil)
    }),
  ),
  http.post(
    `${API}/publik/:slug/verifikasi`,
    denganJaringan(async ({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const sekarang = new Date()
      if (terkunci(db, desa.id, sekarang)) return balasGalat('RATE_LIMITED', PESAN_TERKUNCI, 429)
      const masukan = verifikasiMasukanSchema.safeParse(await bacaJson(request))
      const kode = masukan.success ? rapikanKode(masukan.data.kode) : ''
      // Format yang jelas salah ditolak sebelum mencari, dan tidak dihitung sebagai percobaan.
      if (!kodeSah(kode)) return balasGalat('VALIDATION', PESAN_FORMAT, 422, { kode: PESAN_FORMAT })
      // Hanya surat yang pernah terbit yang punya kode: Selesai, atau Dibatalkan sesudah terbit (fokus review 2).
      const p = db.permohonan.find(
        (x) => x.desaId === desa.id && x.terbit?.kodeVerifikasi === kode && (x.status === 'selesai' || x.status === 'dibatalkan'),
      )
      if (!p?.terbit) {
        if (catatKodeSalah(desa.id, sekarang)) return balasGalat('RATE_LIMITED', PESAN_TERKUNCI, 429)
        return balasGalat('NOT_FOUND', 'Kode tidak ditemukan. Periksa kembali, atau hubungi kantor desa.', 404)
      }
      const jenis = db.jenisSurat.find((j) => j.id === p.jenisId)
      // Nama orang yang diterangkan surat: bayi atau almarhum bila ada, selain itu pemohon.
      const orang = db.penduduk.find((x) => x.id === (p.subjekId ?? p.pemohonId))
      const hasil: HasilVerifikasi = {
        jenis: jenis?.nama ?? 'Surat keterangan',
        nomor: p.terbit.nomor,
        terbit: p.terbit.pada,
        nama: samarkanNama(orang?.nama ?? '-'),
        penandatangan: { jabatan: LABEL_PERAN[p.terbit.penandatangan.peran], nama: p.terbit.penandatangan.nama },
        berlaku: hitungBerlaku(
          { status: p.status, pembatalan: p.pembatalan, berlakuSampai: p.terbit.berlakuSampai },
          tanggalIsoWib(sekarang),
        ),
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
