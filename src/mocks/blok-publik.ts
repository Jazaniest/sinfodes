import { tanggalIsoWib } from '@/domain/format/tanggal'
import { jumlahKelompok } from '@/domain/keuangan/schema'
import {
  agendaPublikSchema, pengumumanPublikSchema,
  type AngkaDesa, type BlokPratinjau, type BlokTampil, type FotoPublik, type ItemMenuPublik, type RingkasArtikel,
} from '@/domain/publik/schema'
import { idVideoYoutube, type Blok, type BlokHtml } from '@/domain/website/blok'
import type { IdMotif } from '@/domain/website/motif'
import { KUNCI_HALAMAN_SISTEM, LABEL_HALAMAN_SISTEM, type Susunan } from '@/domain/website/susunan'
import { statusPengumuman, type Artikel, type Potensi } from '@/domain/website/schema'
import type { Desa } from '@/domain/wilayah/schema'
import { apbdesTerbaru } from './handlers/keuangan'
import { lapisanDesa } from './handlers/tata-kelola'
import { keLencanaPublik, lencanaTampil } from './lencana'
import type { DbDemo } from './tipe-db'

/** Foto kurasi dari galeri beserta keterangan dan kreditnya; null bila berkasnya belum tersedia. */
export function fotoDari(db: DbDemo, desaId: string, berkas: string | null): FotoPublik | null {
  const f = berkas ? db.galeri.find((x) => x.desaId === desaId && x.berkas === berkas && x.tersedia) : undefined
  if (!f) return null
  return { berkas: f.berkas, keterangan: f.judul, kredit: f.kredit ? `${f.kredit.pembuat} · ${f.kredit.lisensi}` : null }
}

/** Sampul Tampilan website dari nilai `tema.sampul`: foto kurasi berkredit, atau unggahan desa (data URL) tanpa kredit. */
export function sampulDari(db: DbDemo, d: Desa, sampul: string | null): FotoPublik | null {
  if (!sampul) return null
  return fotoDari(db, d.id, sampul) ?? { berkas: sampul, keterangan: `Desa ${d.nama}`, kredit: null }
}

export const ringkas = (db: DbDemo, a: Artikel): RingkasArtikel => ({
  slug: a.slug, judul: a.judul, kategori: a.kategori, tanggal: a.tanggal, ringkasan: a.ringkasan, foto: fotoDari(db, a.desaId, a.foto),
})

/** Artikel yang sudah terbit, terbaru dulu. Draf tidak pernah tampil di website. */
export const terbit = (db: DbDemo, desaId: string): Artikel[] =>
  db.artikel.filter((a) => a.desaId === desaId && a.status === 'terbit').sort((a, b) => b.tanggal.localeCompare(a.tanggal))

/** Potensi desa urut tampil (SPEC A9). */
export const potensiDesa = (db: DbDemo, desaId: string): Potensi[] =>
  db.potensi.filter((p) => p.desaId === desaId).sort((a, b) => a.urutan - b.urutan)

/** KK yang masih punya anggota, sama dengan hitungan panel admin (cakupan.ts), supaya angka website dan panel sama. */
export const jumlahKkAktif = (db: DbDemo, desaId: string): number =>
  db.keluarga.filter((k) => k.desaId === desaId && k.anggotaIds.length > 0).length

export function angkaDesa(db: DbDemo, d: Desa): AngkaDesa {
  const dusun = db.dusun.filter((x) => x.desaId === d.id)
  return {
    jiwa: db.penduduk.filter((p) => p.desaId === d.id && p.statusDasar === 'Hidup').length,
    kk: jumlahKkAktif(db, d.id),
    dusun: dusun.length,
    rt: dusun.reduce((n, x) => n + x.rw.reduce((m, rw) => m + rw.rt.length, 0), 0),
    luasKm2: d.luasKm2,
  }
}

/** Pengumuman yang masih berlaku hari ini, terbaru dulu. */
export const pengumumanBerlaku = (db: DbDemo, desaId: string, hariIni: string) =>
  db.pengumuman
    .filter((p) => p.desaId === desaId && statusPengumuman(p, hariIni) === 'berlaku')
    .sort((a, b) => b.mulai.localeCompare(a.mulai))
    .map((p) => pengumumanPublikSchema.parse(p))

/** Agenda mendatang, terdekat dulu, paling banyak 5 seperti beranda v0.1. */
export const agendaMendatang = (db: DbDemo, desaId: string, hariIni: string) =>
  db.agenda
    .filter((a) => a.desaId === desaId && a.tanggal >= hariIni)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.mulai.localeCompare(b.mulai))
    .slice(0, 5)
    .map((a) => agendaPublikSchema.parse(a))

/** Tujuan blok Ajakan menjadi alamat halaman; null bila halaman tujuannya sudah tidak ada di daftar `halaman`. */
function hrefTujuan(d: Desa, tujuan: string, halaman: readonly { id: string; nama: string }[]): string | null {
  const dasar = `/desa/${d.slug}`
  if ((KUNCI_HALAMAN_SISTEM as readonly string[]).includes(tujuan)) return `${dasar}/${tujuan}`
  const halamanTujuan = halaman.find((h) => h.id === tujuan)
  return halamanTujuan ? `${dasar}/halaman/${halamanTujuan.nama}` : null
}

/**
 * Sumber tampilan untuk penyelesaian blok: motif dan sampul tema, daftar halaman untuk tujuan blok Ajakan, daftar kode
 * HTML untuk blok `html`, serta tanda tingkat Lanjut (7G) yang mengatur apakah blok `html` tampil di website publik.
 */
export type SumberTampil = {
  motif: IdMotif
  sampul: string | null
  halaman: readonly { id: string; nama: string }[]
  blokHtml: readonly BlokHtml[]
  lanjut: boolean
}

/** Hasil penyelesaian: blok siap tampil, atau blok bertanda `kosong` (hanya untuk mode pratinjau). */
type BlokSelesai = BlokTampil | (Blok & { kosong: true })

/**
 * Selesaikan blok susunan menjadi blok siap tampil (SPEC-V0.2 11.4): `data` per jenis diisi dari modul terkait, sama dengan
 * sumber endpoint v0.1. Blok tersembunyi, blok kosong (sumbernya tidak ada), blok jenis tak dikenal, dan Ajakan ke halaman
 * yang sudah dihapus dilewati. Blok kabar memakai cakupan `jumlah` artikel terbaru; artikel yang sudah tampil di blok kabar
 * sebelumnya pada halaman yang sama tidak diulang, sehingga susunan Warta menampilkan 1 berita utama dan 4 baris Kabar
 * terbaru persis seperti beranda v0.1.
 */
export function selesaikanBlok(db: DbDemo, desa: Desa, blok: readonly Blok[], sekarang: Date, sumber: SumberTampil): BlokTampil[] {
  return selesaikan(db, desa, blok, sekarang, sumber, 'terbit') as BlokTampil[]
}

/**
 * Penyelesaian untuk pratinjau penyunting (7F-2): blok tersembunyi ikut dengan `tersembunyi: true`, dan blok yang sumbernya
 * belum ada ikut bertanda `kosong: true` tanpa `data`. Blok tersembunyi menyelesaikan datanya sendiri tanpa memengaruhi
 * cakupan blok tampil, supaya bagian yang tampil sama dengan hasil terbit.
 */
export function pratinjauBlok(db: DbDemo, desa: Desa, blok: readonly Blok[], sekarang: Date, sumber: SumberTampil): BlokPratinjau[] {
  return selesaikan(db, desa, blok, sekarang, sumber, 'pratinjau').map((b) => ('kosong' in b ? b : { ...b, kosong: false as const }))
}

function selesaikan(
  db: DbDemo,
  desa: Desa,
  blok: readonly Blok[],
  sekarang: Date,
  sumber: SumberTampil,
  mode: 'terbit' | 'pratinjau',
): BlokSelesai[] {
  const hariIni = tanggalIsoWib(sekarang)
  const semuaArtikel = terbit(db, desa.id)
  const sudahTampil = new Set<string>()
  const hasil: BlokSelesai[] = []
  const kosong = (b: Blok) => {
    if (mode === 'pratinjau') hasil.push({ ...b, kosong: true })
  }
  const push = (b: BlokTampil) => {
    hasil.push(b)
  }
  for (const b of blok) {
    if (b.tersembunyi && mode === 'terbit') continue
    // Blok tersembunyi (hanya di pratinjau) memakai jejak sendiri agar cakupan blok tampil tetap sama dengan terbit.
    const jejak = b.tersembunyi ? new Set<string>() : sudahTampil
    switch (b.jenis) {
      case 'kabar': {
        if (b.varian === 'sorotan') {
          const utama =
            semuaArtikel.find((a) => a.foto !== null && !jejak.has(a.slug)) ?? semuaArtikel.find((a) => !jejak.has(a.slug))
          if (!utama) {
            kosong(b)
            break
          }
          jejak.add(utama.slug)
          push({ ...b, data: { artikel: [ringkas(db, utama)] } })
        } else {
          const artikel = semuaArtikel.slice(0, b.isi.jumlah).filter((a) => !jejak.has(a.slug))
          for (const a of artikel) jejak.add(a.slug)
          if (artikel.length > 0) push({ ...b, data: { artikel: artikel.map((a) => ringkas(db, a)) } })
          else kosong(b)
        }
        break
      }
      case 'apbdes': {
        const apbdes = apbdesTerbaru(desa.id)
        if (apbdes) push({ ...b, data: { tahun: apbdes.tahun, pendapatan: jumlahKelompok(apbdes, 'pendapatan'), belanja: jumlahKelompok(apbdes, 'belanja') } })
        else kosong(b)
        break
      }
      case 'pengumuman-agenda': {
        const pengumuman = pengumumanBerlaku(db, desa.id, hariIni)
        const agenda = agendaMendatang(db, desa.id, hariIni)
        if (pengumuman.length > 0 || agenda.length > 0) push({ ...b, data: { pengumuman, agenda } })
        else kosong(b)
        break
      }
      case 'galeri': {
        const foto = db.galeri
          .filter((f) => f.desaId === desa.id && f.tersedia)
          .slice(0, b.isi.jumlah)
          .map((f) => fotoDari(db, desa.id, f.berkas))
          .filter((f): f is FotoPublik => f !== null)
        if (foto.length > 0) push({ ...b, data: { foto } })
        else kosong(b)
        break
      }
      case 'peta': {
        const lapisan = lapisanDesa(db, desa.id)
        if (lapisan) push({ ...b, data: { lapisan } })
        else kosong(b)
        break
      }
      case 'potensi': {
        const potensi = potensiDesa(db, desa.id)
          .slice(0, b.isi.jumlah)
          .map((p) => ({ id: p.id, judul: p.judul, kategori: p.kategori, foto: fotoDari(db, desa.id, p.foto) }))
        if (potensi.length > 0) push({ ...b, data: { potensi } })
        else kosong(b)
        break
      }
      case 'ajakan': {
        const href = hrefTujuan(desa, b.isi.tujuan, sumber.halaman)
        if (href) push({ ...b, data: { href } })
        else kosong(b)
        break
      }
      case 'video':
        if (idVideoYoutube(b.isi.url) !== null) push({ ...b, data: undefined })
        else kosong(b)
        break
      case 'sampul':
        push({ ...b, data: { nama: desa.nama, sampul: sampulDari(db, desa, sumber.sampul) } })
        break
      case 'angka':
        push({ ...b, data: { nama: desa.nama, angka: angkaDesa(db, desa), sampul: sampulDari(db, desa, sumber.sampul) } })
        break
      case 'kontak':
        push({
          ...b,
          data: { nama: desa.nama, alamatKantor: desa.alamatKantor, telepon: desa.telepon, surel: desa.surel, jamLayanan: desa.jamLayanan },
        })
        break
      case 'lencana': {
        const lencana = lencanaTampil(db, desa.id).map(keLencanaPublik)
        if (lencana.length > 0) push({ ...b, data: { lencana } })
        else kosong(b)
        break
      }
      case 'pemisah':
        push({ ...b, data: { motif: sumber.motif } })
        break
      case 'html': {
        // Blok HTML (7G): kodenya diambil dari daftar versi situs; di website publik dilewati saat tingkat Lanjut mati.
        if (mode === 'terbit' && !sumber.lanjut) break
        const kode = sumber.blokHtml.find((k) => k.id === b.isi.htmlId)
        if (kode) push({ ...b, data: { nama: kode.nama, kode: kode.kode, tinggi: kode.tinggi } })
        else kosong(b)
        break
      }
      default:
        push({ ...b, data: undefined })
    }
  }
  return hasil
}

/** Menu website dari susunan (SPEC-V0.2 11.4): Beranda selalu pertama, halaman tersembunyi hilang, tautan luar bertanda. */
export function menuSitus(d: Desa, susunan: Susunan): ItemMenuPublik[] {
  const dasar = `/desa/${d.slug}`
  const hasil: ItemMenuPublik[] = [{ label: 'Beranda', href: dasar, luar: false }]
  for (const item of susunan.menu) {
    if (item.jenis === 'sistem') {
      if (!item.tampil) continue
      hasil.push({ label: LABEL_HALAMAN_SISTEM[item.kunci], href: `${dasar}/${item.kunci}`, luar: false })
    } else if (item.jenis === 'halaman') {
      const halaman = susunan.halaman.find((h) => h.id === item.halamanId)
      if (halaman) hasil.push({ label: halaman.judul, href: `${dasar}/halaman/${halaman.nama}`, luar: false })
    } else {
      hasil.push({ label: item.label, href: item.url, luar: true })
    }
  }
  return hasil
}
