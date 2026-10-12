import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import { barisPengaduanSchema, type Pengaduan } from '@/domain/pengaduan/schema'
import { periksaFotoKirim, ukuranKb } from '@/domain/warga/foto'
import { balasanWargaSchema, judulDariCerita, kirimPengaduanWargaSchema } from '@/domain/warga/pengaduan'
import { ambilDb, ubahDb } from '../db'
import { API, balasDaftar, balasGalat, denganJaringan } from '../http'
import { bacaMultipart, catatKiriman, kirimanSebelumnya } from '../kiriman-warga'
import { kirimNotifikasi } from '../notifikasi'
import { butuhWarga, type WargaMasuk } from '../sesi-mock'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, catatAktivitas, idBaru } from '../tulis'

const TIDAK_DITEMUKAN = 'Pengaduan tidak ditemukan.'

/** Pengaduan milik warga ini; pengaduan orang lain tidak pernah terlihat (fokus review 3). */
const milik = (db: DbDemo, w: WargaMasuk) =>
  db.pengaduan.filter((a) => a.desaId === w.penduduk.desaId && a.pelapor.pendudukId === w.penduduk.id)

/** ADU-2026-031: nomor urut berikutnya di tahun berjalan. */
function nomorBerikutnya(db: DbDemo, desaId: string, tahun: string): string {
  const awalan = `ADU-${tahun}-`
  const urut = db.pengaduan.filter((a) => a.desaId === desaId && a.nomor.startsWith(awalan)).map((a) => Number(a.nomor.slice(awalan.length)))
  return `${awalan}${String(1 + Math.max(0, ...urut)).padStart(3, '0')}`
}

/** Pengaduan dari layanan warga (SPEC §10). */
export const handlerWargaPengaduan = [
  http.get(
    `${API}/warga/pengaduan`,
    denganJaringan(({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const semua = milik(ambilDb(), w).sort((a, b) => b.masukPada.localeCompare(a.masukPada))
      return balasDaftar(semua, 1, Math.max(semua.length, 1), (a) => barisPengaduanSchema.parse(a))
    }),
  ),
  http.post(
    `${API}/warga/pengaduan`,
    denganJaringan(async ({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const { data, berkas } = await bacaMultipart(request)
      const masukan = kirimPengaduanWargaSchema.safeParse(data)
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const m = masukan.data
      const db = ambilDb()
      const lama = kirimanSebelumnya(db, w.penduduk.id, 'pengaduan', m.kunci)
      const sudahAda = lama ? db.pengaduan.find((x) => x.id === lama.rujukanId) : undefined
      if (sudahAda) return HttpResponse.json({ id: sudahAda.id, nomor: sudahAda.nomor })

      const daftarFoto = berkas('foto')
      const foto = daftarFoto[0] ?? null
      if (daftarFoto.length > 1) return balasField('foto', 'Lampirkan satu foto saja.')
      if (foto) {
        const g = periksaFotoKirim(foto)
        if (g) return balasField('foto', g)
      }
      const waktu = waktuIsoWib(new Date())
      const judul = judulDariCerita(m.cerita)
      const a: Pengaduan = {
        id: idBaru(db, 'adu'), desaId: w.penduduk.desaId, dusunId: w.penduduk.dusunId,
        nomor: nomorBerikutnya(db, w.penduduk.desaId, waktu.slice(0, 4)), judul, kategori: m.kategori,
        pelapor: { pendudukId: w.penduduk.id, nama: w.penduduk.nama }, lokasi: m.lokasi ? m.lokasi : null, masukPada: waktu,
        status: 'baru', tanggapanPertamaPada: null, selesaiPada: null,
        percakapan: [
          { jenis: 'warga', id: idBaru(db, 'pes'), waktu, isi: m.cerita, foto: foto ? { berkas: foto.name, ukuranKb: ukuranKb(foto.size) } : null },
        ],
      }
      const rujukan = { jenis: 'pengaduan' as const, id: a.id }
      ubahDb((d) => {
        d.pengaduan.push(a)
        catatKiriman(d, { kunci: m.kunci, pendudukId: w.penduduk.id, jenis: 'pengaduan', rujukanId: a.id })
        catatAktivitas(d, {
          desaId: a.desaId, dusunId: a.dusunId, waktu, jenis: 'pengaduan-masuk', ringkasan: `Pengaduan masuk · ${judul} (${a.pelapor.nama})`,
          oleh: null, rujukan,
        })
        kirimNotifikasi(d, {
          desaId: a.desaId, untuk: 'pengaduan.tanggapi', kecuali: null, jenis: 'pengaduan-baru', judul: `${a.nomor} · ${judul}`,
          isi: `${a.kategori} · ${a.pelapor.nama}`, waktu, rujukan,
        })
      })
      return HttpResponse.json({ id: a.id, nomor: a.nomor }, { status: 201 })
    }),
  ),
  http.get(
    `${API}/warga/pengaduan/:id`,
    denganJaringan(({ request, params }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const a = milik(ambilDb(), w).find((x) => x.id === String(params.id))
      return a ? HttpResponse.json(a) : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
    }),
  ),
  http.post(
    `${API}/warga/pengaduan/:id/balasan`,
    denganJaringan(async ({ request, params }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const a = milik(ambilDb(), w).find((x) => x.id === String(params.id))
      if (!a) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      // Sama dengan aturan admin: pengaduan Selesai dibuka kembali oleh petugas, bukan oleh balasan.
      if (a.status === 'selesai') {
        return balasGalat('CONFLICT', 'Pengaduan ini sudah selesai. Bila masalahnya muncul lagi, sampaikan pengaduan baru.', 409)
      }
      const isian = balasanWargaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      ubahDb((d) => {
        a.percakapan.push({ jenis: 'warga', id: idBaru(d, 'pes'), waktu: waktuIsoWib(new Date()), isi: isian.data.isi, foto: null })
      })
      return HttpResponse.json(a)
    }),
  ),
]
