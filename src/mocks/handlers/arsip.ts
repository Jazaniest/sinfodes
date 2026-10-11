import { http, HttpResponse } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import {
  BERKAS_SCAN, filterSuratKeluarSchema, filterSuratMasukSchema, isianSuratMasukSchema, MAKS_SCAN_MB, type BarisSuratKeluar,
  type SuratMasuk,
} from '@/domain/surat/arsip'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasDaftar, denganJaringan } from '../http'
import { balasField, balasIsianTidakValid, butuhKemampuan, idBaru, pelakuDari } from '../tulis'

const butuhPembaca = (request: Request) => butuhKemampuan(request, 'surat.lihat', 'Peran Anda tidak berhak membuka Layanan Surat.')
const bacaQuery = (request: Request): Record<string, string> => Object.fromEntries(new URL(request.url).searchParams)
const bulanBerjalan = () => tanggalIsoWib(new Date()).slice(0, 7)

/** Arsip Layanan Surat (SPEC §7.4 layar 5). Surat keluar dibaca dari permohonan yang pernah terbit. */
export const handlerArsip = [
  http.get(
    `${API}/surat-keluar`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const query = bacaQuery(request)
      const filter = filterSuratKeluarSchema.safeParse(query)
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const f = filter.data
      const bulan = f.bulan ?? bulanBerjalan()
      // Kepala Dusun: permohonan dusunnya saja (dataMilik). Nama yang diterangkan dicari di seluruh desa.
      const { db, permohonan, jenisSurat } = dataMilik(pengguna)
      const jenis = new Map(jenisSurat.map((j) => [j.id, j]))
      const nama = new Map(db.penduduk.map((p) => [p.id, p.nama]))
      const baris: BarisSuratKeluar[] = []
      for (const p of permohonan) {
        const t = p.terbit
        const j = jenis.get(p.jenisId)
        if (!t || !j || !t.pada.startsWith(bulan)) continue
        if (f.jenis && j.kode !== f.jenis) continue
        if (f.penandatangan && t.penandatangan.peran !== f.penandatangan) continue
        baris.push({
          id: p.id,
          nomor: t.nomor,
          urut: t.urut,
          tanggal: t.pada.slice(0, 10),
          jenis: { kode: j.kode, nama: j.nama },
          untuk: nama.get(p.subjekId ?? p.pemohonId) ?? 'Penduduk tidak ditemukan',
          penandatangan: { nama: t.penandatangan.nama, peran: t.penandatangan.peran },
          kanal: p.kanal,
          status: p.status === 'dibatalkan' ? 'dibatalkan' : 'selesai',
        })
      }
      baris.sort((a, b) => a.urut - b.urut)
      return query.semua === '1' ? balasDaftar(baris, 1, Math.max(baris.length, 1)) : balasDaftar(baris, f.page, f.pageSize)
    }),
  ),
  http.get(
    `${API}/surat-masuk`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPembaca(request)
      if (pengguna instanceof Response) return pengguna
      const filter = filterSuratMasukSchema.safeParse(bacaQuery(request))
      if (!filter.success) return balasIsianTidakValid(filter.error)
      const bulan = filter.data.bulan ?? bulanBerjalan()
      // Surat masuk ditujukan ke desa, tidak terikat dusun: Kepala Dusun melihat seluruh register.
      const daftar = dataMilik(pengguna)
        .db.suratMasuk.filter((s) => s.desaId === pengguna.desaId && s.diterima.startsWith(bulan))
        .sort((a, b) => a.diterima.localeCompare(b.diterima) || a.noAgenda - b.noAgenda)
      return balasDaftar(daftar, filter.data.page, filter.data.pageSize)
    }),
  ),
  http.post(
    `${API}/surat-masuk`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhKemampuan(request, 'surat.proses', 'Peran Anda tidak berhak mencatat surat masuk.')
      if (pengguna instanceof Response) return pengguna
      const form = await request.formData().catch(() => null)
      const teks = (kunci: string) => {
        const nilai = form?.get(kunci)
        return typeof nilai === 'string' ? nilai : ''
      }
      const isian = isianSuratMasukSchema.safeParse({
        diterima: teks('diterima'),
        nomor: teks('nomor'),
        tanggalSurat: teks('tanggalSurat'),
        pengirim: teks('pengirim'),
        perihal: teks('perihal'),
        disposisiKepada: teks('disposisiKepada') || null,
        disposisiInstruksi: teks('disposisiInstruksi'),
      })
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const x = isian.data
      if (x.diterima > tanggalIsoWib(new Date())) return balasField('diterima', 'Tanggal terima tidak boleh sesudah hari ini')
      const scan = form?.get('scan')
      if (scan instanceof File) {
        if (!BERKAS_SCAN.some((e) => scan.name.toLowerCase().endsWith(e))) return balasField('scan', 'Scan harus berkas PDF, JPG, atau PNG')
        if (scan.size > MAKS_SCAN_MB * 1024 * 1024) return balasField('scan', `Ukuran scan maksimal ${MAKS_SCAN_MB} MB`)
      }
      // Mulai di sini tanpa `await`: dua kiriman beruntun tidak bisa memakai nomor agenda yang sama.
      const { db } = dataMilik(pengguna)
      const tahun = x.diterima.slice(0, 4)
      const noAgenda =
        1 + Math.max(0, ...db.suratMasuk.filter((s) => s.desaId === pengguna.desaId && s.diterima.startsWith(tahun)).map((s) => s.noAgenda))
      const baru: SuratMasuk = {
        id: idBaru(db, 'sm'),
        desaId: pengguna.desaId,
        noAgenda,
        diterima: x.diterima,
        nomor: x.nomor,
        tanggalSurat: x.tanggalSurat,
        pengirim: x.pengirim,
        perihal: x.perihal,
        scan: scan instanceof File ? { berkas: scan.name, ukuranKb: Math.max(1, Math.ceil(scan.size / 1024)) } : null,
        disposisi: x.disposisiKepada ? { kepada: x.disposisiKepada, instruksi: x.disposisiInstruksi } : null,
        dicatat: { oleh: pelakuDari(pengguna), pada: waktuIsoWib(new Date()) },
      }
      ubahDb((d) => {
        d.suratMasuk.push(baru)
      })
      return HttpResponse.json(baru, { status: 201 })
    }),
  ),
]
