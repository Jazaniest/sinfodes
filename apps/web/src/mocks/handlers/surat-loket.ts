import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { peranMengizinkan, statusMengizinkan, tahapAwalTtd } from '@/domain/surat/alur'
import { dilayani, periksaIsian, saringIsian } from '@/domain/surat/jenis'
import { periksaPemohon } from '@/domain/surat/pemohon'
import { buatPermohonanSchema, type DetailPermohonan, type Permohonan, type SaranSurat } from '@/domain/surat/permohonan'
import { JENIS_MUTASI_SURAT, saranDariMutasi } from '@/domain/surat/saran'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { bacaJson, balasField, balasIsianTidakValid, butuhKemampuan, catatAktivitas, idBaru, pelakuDari } from '../tulis'
import { balasDetail, detailPermohonan, keBaris, namaPejabat, pengaturanDesa, suratMilik } from './surat'
import { catatRiwayatSurat } from './surat-aksi'

const kueriSaranSchema = z.object({
  jenis: z.string().regex(/^[A-Z]{2,5}$/),
  pemohon: z.string().optional(),
  subjek: z.string().optional(),
})
const butuhPembuat = (request: Request) => butuhKemampuan(request, 'surat.proses', 'Peran Anda tidak berhak membuat surat.')

/** Didaftarkan sebelum `handlerSurat`, supaya "antrian-ttd" dan "saran" tidak dibaca sebagai ID permohonan. */
export const handlerSuratLoket = [
  http.post(
    `${API}/permohonan`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPembuat(request)
      if (pengguna instanceof Response) return pengguna
      const masukan = buatPermohonanSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      // Mulai di sini tanpa `await`: dua klik "Ajukan" tidak bisa memakai nomor urut yang sama.
      const m = masukan.data
      const { db, jenisSurat } = dataMilik(pengguna)
      const jenis = jenisSurat.find((j) => j.id === m.jenisId)
      if (!jenis) return balasField('jenisId', 'Jenis surat tidak ditemukan.')
      // Jenis mati atau diarsipkan hanya menutup permohonan baru; yang sudah berjalan tetap diproses (fokus review 1).
      if (!dilayani(jenis)) return balasField('jenisId', 'Jenis surat ini tidak tersedia.', 'CONFLICT')
      const warga = (id: string | null) => (id ? db.penduduk.find((p) => p.id === id && p.desaId === pengguna.desaId) : undefined)
      const pemohon = warga(m.pemohonId)
      if (!pemohon) return balasField('pemohonId', 'Pemohon tidak ditemukan.')
      const subjek = warga(m.subjekId) ?? null
      if (m.subjekId && !subjek) return balasField('subjekId', 'Penduduk yang diterangkan tidak ditemukan.')
      const mutasi = m.mutasiId ? (db.mutasi.find((x) => x.id === m.mutasiId && x.desaId === pengguna.desaId) ?? null) : null
      const cek = periksaPemohon(jenis, pemohon, subjek, mutasi)
      if (cek.blokir) return balasField(cek.blokir.kolom === 'pemohon' ? 'pemohonId' : 'subjekId', cek.blokir.pesan)
      const isian = saringIsian(jenis, m.isian)
      if (m.ajukan) {
        const galat = Object.entries(periksaIsian(jenis, isian))
        if (galat.length > 0) {
          return balasGalat('VALIDATION', 'Isian surat belum lengkap.', 422, Object.fromEntries(galat.map(([k, v]) => [`isian.${k}`, v])))
        }
      }
      const waktu = waktuIsoWib(new Date())
      const oleh = pelakuDari(pengguna)
      const tahun = waktu.slice(0, 4)
      const noUrut =
        1 + Math.max(0, ...db.permohonan.filter((x) => x.desaId === pengguna.desaId && x.masukPada.startsWith(tahun)).map((x) => x.noUrut))
      const p: Permohonan = {
        id: idBaru(db, 'srt'), desaId: pengguna.desaId, dusunId: pemohon.dusunId, noUrut, jenisId: jenis.id, kanal: 'loket',
        pemohonId: pemohon.id, subjekId: subjek?.id ?? null, mutasiId: mutasi?.id ?? null, isian,
        status: m.ajukan ? 'perlu-ttd' : 'diproses', tahap: m.ajukan ? tahapAwalTtd(jenis) : null,
        dikembalikan: null, penolakan: null, pembatalan: null, diambil: null, masukPada: waktu, ditutupPada: null,
        lampiran: [], catatanInternal: null, riwayat: [], terbit: null,
      }
      ubahDb((d) => {
        d.permohonan.push(p)
        catatRiwayatSurat(d, p, 'dibuat', oleh, waktu)
        if (m.ajukan) catatRiwayatSurat(d, p, 'ajukan-ttd', oleh, waktu)
        catatAktivitas(d, {
          desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'permohonan-masuk',
          ringkasan: `Permohonan ${jenis.kode} · ${pemohon.nama} (loket)`, oleh, rujukan: { jenis: 'permohonan', id: p.id },
        })
      })
      return balasDetail(db, p)
    }),
  ),
  http.get(
    `${API}/permohonan/antrian-ttd`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'surat.tandatangani', 'Peran Anda tidak menandatangani surat.')
      if (pengguna instanceof Response) return pengguna
      const { db, permohonan, jenisSurat } = dataMilik(pengguna)
      const jenis = new Map(jenisSurat.map((j) => [j.id, j]))
      const daftar: DetailPermohonan[] = []
      for (const p of [...permohonan].sort((a, b) => a.masukPada.localeCompare(b.masukPada))) {
        const j = jenis.get(p.jenisId)
        if (!j || !statusMengizinkan('tandatangani', p) || !peranMengizinkan('tandatangani', pengguna.peran, j)) continue
        const detail = detailPermohonan(db, p)
        if (detail) daftar.push(detail)
      }
      return HttpResponse.json(daftar)
    }),
  ),
  http.get(
    `${API}/permohonan/saran`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembuat(request)
      if (pengguna instanceof Response) return pengguna
      const kueri = kueriSaranSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!kueri.success) return balasGalat('VALIDATION', 'Permintaan saran tidak valid.', 422)
      const { db } = dataMilik(pengguna)
      const jenis = db.jenisSurat.find((j) => j.desaId === pengguna.desaId && j.kode === kueri.data.jenis)
      if (!jenis) return balasGalat('NOT_FOUND', 'Jenis surat tidak ditemukan.', 404)
      const cari = (id: string) => db.penduduk.find((p) => p.id === id && p.desaId === pengguna.desaId)
      const orangId = kueri.data.subjek ?? kueri.data.pemohon
      const jenisMutasi = JENIS_MUTASI_SURAT[jenis.kode]
      // Mutasi terbaru orang itu yang sesuai jenis suratnya.
      const mutasi =
        orangId && jenisMutasi
          ? (db.mutasi
              .filter((x) => x.desaId === pengguna.desaId && x.jenis === jenisMutasi && x.pendudukIds.includes(orangId))
              .sort((a, b) => b.dicatatPada.localeCompare(a.dicatatPada))[0] ?? null)
          : null
      const orang = orangId ? cari(orangId) : undefined
      const keluarga = orang ? db.penduduk.filter((p) => p.desaId === pengguna.desaId && p.keluargaId === orang.keluargaId) : []
      const saran = saranDariMutasi(jenis, mutasi, cari, keluarga)
      const hasil: SaranSurat = {
        mutasi, pemohonId: saran.pemohonId, isian: saran.isian,
        pengaturan: pengaturanDesa(db, pengguna.desaId), pejabat: namaPejabat(db, pengguna.desaId),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/permohonan/penduduk/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'surat.lihat', 'Peran Anda tidak berhak membuka Layanan Surat.')
      if (pengguna instanceof Response) return pengguna
      const id = String(params.id)
      const { permohonan, petaJenis, petaPenduduk } = suratMilik(pengguna)
      const daftar = permohonan
        .filter((p) => p.pemohonId === id || p.subjekId === id)
        .sort((a, b) => b.masukPada.localeCompare(a.masukPada))
      return balasDaftar(daftar, 1, Math.max(daftar.length, 1), (p) => keBaris(p, petaJenis, petaPenduduk))
    }),
  ),
]
