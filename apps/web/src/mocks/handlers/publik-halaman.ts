import { http, HttpResponse } from 'msw'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { JENIS_LEMBAGA, NAMA_LENGKAP_LEMBAGA, teksMasaBakti, type Pengurus } from '@/domain/lembaga/schema'
import { URUTAN_STATUS } from '@/domain/pembangunan/schema'
import type { HalamanPublik } from '@/domain/publik/schema'
import type { PotensiPublik } from '@/domain/publik/potensi'
import type { PengurusPublik, ProfilPublik } from '@/domain/publik/profil'
import { keStatistikPublik } from '@/domain/publik/statistik'
import type { TransparansiPublik } from '@/domain/publik/transparansi'
import { hitungStatistik } from '@/domain/statistik/penduduk'
import { namaDusun } from '@/domain/wilayah/alamat'
import { fotoDari, jumlahKkAktif, potensiDesa, selesaikanBlok } from '../blok-publik'
import { API, balasGalat, denganJaringan } from '../http'
import { apbdesTerbaru } from './keuangan'
import { barisKegiatan } from './pembangunan'
import { cariDesaPublik } from './publik'
import { lapisanDesa } from './tata-kelola'
import { versiTerbit, sumberTerbit } from './website'

/** Jabatan dan nama saja: website tidak membuka rujukan ke data penduduk (`pendudukId`). */
const keOrang = (p: Pengurus): PengurusPublik => ({ jabatan: p.jabatan, nama: p.nama, masaBakti: teksMasaBakti(p.masaBakti) })

/** Halaman Profil, Transparansi, Statistik, dan Potensi website desa (SPEC §9, §3.4). Tanpa sesi; dibatasi ke desa `:slug`. */
export const handlerPublikHalaman = [
  http.get(
    `${API}/publik/:slug/profil`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const profil = db.profilDesa.find((p) => p.desaId === desa.id)
      const dusun = db.dusun.filter((d) => d.desaId === desa.id).sort((a, b) => a.nomor - b.nomor)
      const pengurus = db.pengurusLembaga.filter((p) => p.desaId === desa.id).sort((a, b) => a.urutan - b.urutan)
      const hasil: ProfilPublik = {
        foto: profil ? fotoDari(db, desa.id, profil.foto) : null,
        sejarah: profil?.sejarah ?? [],
        visi: profil?.visi ?? null,
        misi: profil?.misi ?? [],
        luasKm2: desa.luasKm2,
        batas: desa.batas,
        jarak: profil?.jarak ?? [],
        istilah: desa.istilahWilayah,
        wilayah: dusun.map((d) => ({
          id: d.id, nama: namaDusun(d, desa.istilahWilayah), kepala: d.kepalaDusun, rw: d.rw.length,
          rt: d.rw.reduce((n, w) => n + w.rt.length, 0),
        })),
        peta: lapisanDesa(db, desa.id),
        profilSingkat: profil ? null : (db.rekamDesa.find((r) => r.desaId === desa.id)?.profilSingkat ?? null),
        perangkat: pengurus.filter((p) => p.lembaga === 'perangkat').map(keOrang),
        lembaga: JENIS_LEMBAGA.filter((j) => j !== 'perangkat').flatMap((j) => {
          const anggota = pengurus.filter((p) => p.lembaga === j)
          return anggota.length === 0 ? [] : [{ lembaga: j, nama: NAMA_LENGKAP_LEMBAGA[j], pengurus: anggota.map(keOrang) }]
        }),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/publik/:slug/transparansi`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const apbdes = apbdesTerbaru(desa.id)
      const hasil: TransparansiPublik = {
        apbdes: apbdes ? { tahun: apbdes.tahun, pos: apbdes.pos, sinkronPada: apbdes.sinkronPada } : null,
        kegiatan: db.kegiatan
          .filter((k) => k.desaId === desa.id)
          .map((k) => barisKegiatan(k, apbdes))
          .sort((a, b) => URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status] || a.kodeApbdes.localeCompare(b.kodeApbdes))
          .map((k) => ({
            id: k.id, nama: k.nama, volume: k.volume, lokasi: k.lokasi, sumberDana: k.sumberDana, mulai: k.mulai,
            targetSelesai: k.targetSelesai, progresFisik: k.progresFisik, status: k.status, anggaran: k.anggaran, realisasi: k.realisasi,
            dokumentasi: k.dokumentasi.map((d) => ({ ...d, foto: fotoDari(db, desa.id, d.foto) })),
          })),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/publik/:slug/statistik`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const sekarang = new Date()
      // Perhitungan yang sama dengan Statistik panel admin (SPEC §6.7), untuk seluruh desa.
      const s = hitungStatistik(
        db.penduduk.filter((p) => p.desaId === desa.id),
        {
          hariIni: sekarang, dusun: db.dusun.filter((d) => d.desaId === desa.id), istilah: desa.istilahWilayah, dusunTerpilih: null,
          kk: jumlahKkAktif(db, desa.id),
        },
      )
      return HttpResponse.json(keStatistikPublik(s, tanggalIsoWib(sekarang)))
    }),
  ),
  http.get(
    `${API}/publik/:slug/potensi`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const hasil: PotensiPublik = {
        potensi: potensiDesa(db, desa.id).map((p) => ({
          id: p.id, judul: p.judul, kategori: p.kategori, ringkasan: p.ringkasan, isi: p.isi, foto: fotoDari(db, desa.id, p.foto),
        })),
        umkm: db.umkm
          .filter((u) => u.desaId === desa.id)
          .map((u) => {
            const d = db.dusun.find((x) => x.id === u.dusunId)
            return {
              id: u.id, nama: u.nama, pemilik: u.pemilik, produk: u.produk, dusun: d ? namaDusun(d, desa.istilahWilayah) : '',
              whatsapp: u.whatsapp,
            }
          }),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/publik/:slug/halaman/:nama`,
    denganJaringan(({ request, params }) => {
      const c = cariDesaPublik(params.slug, request)
      if (c instanceof Response) return c
      const { db, desa } = c
      const halaman = versiTerbit(db, desa.id).susunan.halaman.find((h) => h.nama === String(params.nama))
      if (!halaman) return balasGalat('NOT_FOUND', 'Halaman tidak ditemukan.', 404)
      const hasil: HalamanPublik = { judul: halaman.judul, blok: selesaikanBlok(db, desa, halaman.blok, new Date(), sumberTerbit(db, desa.id)) }
      return HttpResponse.json(hasil)
    }),
  ),
]
