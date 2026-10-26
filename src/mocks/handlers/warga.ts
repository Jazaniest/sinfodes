import { http, HttpResponse } from 'msw'
import { hitungUmur, tanggalIsoWib } from '@/domain/format/tanggal'
import { jadwalBerikut } from '@/domain/kesehatan/schema'
import type { Permohonan } from '@/domain/surat/permohonan'
import { nomorTiket } from '@/domain/warga/ajukan'
import type { BerandaWarga } from '@/domain/warga/beranda'
import {
  milikWarga, posisiPermohonan, riwayatUntukWarga, tampilDiBeranda,
  type DetailPermohonanWarga, type RingkasPermohonanWarga,
} from '@/domain/warga/permohonan'
import { statusPengumuman } from '@/domain/website/schema'
import { ambilDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { modulDesaDi } from '../modul'
import { butuhWarga, type WargaMasuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { pengaturanDesa } from './surat'

const BATAS_BALITA_BULAN = 60
const PERMOHONAN_TIDAK_DITEMUKAN = 'Permohonan tidak ditemukan.'

function ringkasUntukWarga(db: DbDemo, p: Permohonan): RingkasPermohonanWarga {
  const jenis = db.jenisSurat.find((j) => j.id === p.jenisId)
  const untukId = p.subjekId ?? p.pemohonId
  const untuk = db.penduduk.find((x) => x.id === untukId)
  return {
    id: p.id,
    status: p.status,
    tahap: p.tahap,
    dikembalikan: p.dikembalikan !== null,
    masukPada: p.masukPada,
    ditutupPada: p.ditutupPada,
    jenis: { kode: jenis?.kode ?? '?', nama: jenis?.nama ?? 'Jenis surat tidak dikenal' },
    untuk: { id: untukId, nama: untuk?.nama ?? 'Penduduk tidak ditemukan' },
    posisi: posisiPermohonan({
      status: p.status, tahap: p.tahap, dikembalikan: p.dikembalikan !== null, diambil: p.diambil !== null, mode: p.terbit?.mode ?? null,
    }),
    nomor: p.terbit?.nomor ?? null,
    tiket: nomorTiket(p),
  }
}

/** Permohonan milik warga di desanya, terbaru dulu (fokus review 3). */
const permohonanMilik = (db: DbDemo, w: WargaMasuk) =>
  db.permohonan
    .filter((p) => p.desaId === w.penduduk.desaId && milikWarga(p, w.penduduk.id))
    .sort((a, b) => b.masukPada.localeCompare(a.masukPada))

function posyanduKeluarga(db: DbDemo, w: WargaMasuk, sekarang: Date): BerandaWarga['posyandu'] {
  const balita = db.penduduk
    .filter((p) => p.keluargaId === w.penduduk.keluargaId && p.statusDasar === 'Hidup')
    .map((p) => ({ id: p.id, nama: p.nama, umurBulan: hitungUmur(p.tanggalLahir, sekarang).bulan }))
    .filter((b) => b.umurBulan < BATAS_BALITA_BULAN)
  const pos = db.posyandu.find((x) => x.dusunId === w.penduduk.dusunId)
  if (balita.length === 0 || !pos || !modulDesaDi(w.penduduk.desaId).kesehatan) return null
  return { nama: pos.nama, tempat: pos.tempat, jadwal: jadwalBerikut(pos.jadwal, tanggalIsoWib(sekarang)), balita }
}

function bantuanKeluarga(db: DbDemo, w: WargaMasuk, hariIni: string): BerandaWarga['bantuan'] {
  return db.penerimaBansos
    .filter((x) => x.keluargaId === w.penduduk.keluargaId)
    .flatMap((x) => {
      const program = db.programBansos.find((p) => p.id === x.programId)
      if (!program) return []
      const tahap = program.tahap.map((t, i) => ({ ...t, status: x.penyaluran.at(i) ?? 'dijadwalkan' }))
      const terakhir = tahap.filter((t) => t.status !== 'dijadwalkan').at(-1)
      const berikut = tahap.find((t) => t.status === 'dijadwalkan' && t.jadwal >= hariIni)
      return [{
        id: x.id,
        program: program.nama,
        bentuk: program.bentuk,
        terakhir: terakhir ? { ke: terakhir.ke, periode: terakhir.periode, status: terakhir.status } : null,
        berikut: berikut ? { ke: berikut.ke, periode: berikut.periode, jadwal: berikut.jadwal } : null,
      }]
    })
}

/** Beranda dan Riwayat layanan warga (SPEC §10). */
export const handlerWarga = [
  http.get(
    `${API}/warga/beranda`,
    denganJaringan(({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const db = ambilDb()
      const sekarang = new Date()
      const hariIni = tanggalIsoWib(sekarang)
      const beranda: BerandaWarga = {
        permohonan: permohonanMilik(db, w)
          .filter((p) => tampilDiBeranda(p, sekarang))
          .map((p) => ringkasUntukWarga(db, p)),
        pengumuman: db.pengumuman
          .filter((p) => p.desaId === w.penduduk.desaId && statusPengumuman(p, hariIni) === 'berlaku')
          .sort((a, b) => b.mulai.localeCompare(a.mulai))
          .slice(0, 3),
        posyandu: posyanduKeluarga(db, w, sekarang),
        bantuan: bantuanKeluarga(db, w, hariIni),
      }
      return HttpResponse.json(beranda)
    }),
  ),
  http.get(
    `${API}/warga/permohonan`,
    denganJaringan(({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const db = ambilDb()
      const semua = permohonanMilik(db, w)
      return balasDaftar(semua, 1, Math.max(semua.length, 1), (p) => ringkasUntukWarga(db, p))
    }),
  ),
  http.get(
    `${API}/warga/permohonan/:id`,
    denganJaringan(({ request, params }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const db = ambilDb()
      const p = db.permohonan.find(
        (x) => x.id === String(params.id) && x.desaId === w.penduduk.desaId && milikWarga(x, w.penduduk.id),
      )
      // Permohonan orang lain dijawab sama dengan yang tidak ada, supaya ID tidak bisa ditebak-tebak (fokus review 3).
      if (!p) return balasGalat('NOT_FOUND', PERMOHONAN_TIDAK_DITEMUKAN, 404)
      const jenis = db.jenisSurat.find((j) => j.id === p.jenisId)
      if (!jenis) return balasGalat('SERVER', 'Data permohonan tidak utuh.', 500)
      const { kertas, huruf } = pengaturanDesa(db, p.desaId)
      const detail: DetailPermohonanWarga = {
        permohonan: {
          ...ringkasUntukWarga(db, p),
          isian: p.isian,
          riwayat: riwayatUntukWarga(p.riwayat),
          alasanDitolak: p.penolakan?.catatan ?? null,
          diambilPada: p.diambil?.pada ?? null,
        },
        jenis: { kode: jenis.kode, nama: jenis.nama, isian: jenis.isian },
        terbit: p.status === 'selesai' ? p.terbit : null,
        pengaturan: { kertas, huruf },
      }
      return HttpResponse.json(detail)
    }),
  ),
]
