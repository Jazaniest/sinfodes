import { http, HttpResponse } from 'msw'
import { hitungUmur, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { IsiPerbaikan, LaporanData } from '@/domain/laporan/schema'
import { teksNilaiRiwayat } from '@/domain/penduduk/perubahan'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import { HUBUNGAN_KELUARGA } from '@/domain/penduduk/enum'
import { periksaFotoKirim, ukuranKb } from '@/domain/warga/foto'
import { kirimLaporanWargaSchema, periksaNilaiLaporan, type KeluargaWarga, type LaporanWarga } from '@/domain/warga/keluarga'
import { alamatLengkap } from '@/domain/wilayah/alamat'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { bacaMultipart, catatKiriman, kirimanSebelumnya } from '../kiriman-warga'
import { kirimNotifikasi } from '../notifikasi'
import { butuhWarga } from '../sesi-mock'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { balasField, balasIsianTidakValid, idBaru } from '../tulis'

const DATA_TIDAK_UTUH = 'Data keluarga tidak lengkap.'

function keLaporanWarga(db: DbDemo, l: LaporanData): LaporanWarga | null {
  if (l.isi.jenis !== 'perbaikan') return null
  const isi = l.isi
  return {
    id: l.id,
    pendudukId: isi.pendudukId,
    namaPenduduk: db.penduduk.find((p) => p.id === isi.pendudukId)?.nama ?? 'Penduduk tidak ditemukan',
    field: isi.field,
    nilaiBaru: isi.nilaiBaru,
    status: l.status,
    dibuatPada: l.dibuatPada,
    alasanDitolak: l.status === 'ditolak' ? (l.ditangani?.alasan ?? null) : null,
  }
}

/** Keluarga saya dan laporan perbaikan data (SPEC §10). */
export const handlerWargaKeluarga = [
  http.get(
    `${API}/warga/keluarga`,
    denganJaringan(({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const db = ambilDb()
      const kk = db.keluarga.find((k) => k.id === w.penduduk.keluargaId)
      const desa = db.desa.find((d) => d.id === w.penduduk.desaId)
      if (!kk || !desa) return balasGalat('SERVER', DATA_TIDAK_UTUH, 500)
      const sekarang = new Date()
      const urutan = (h: (typeof HUBUNGAN_KELUARGA)[number]) => HUBUNGAN_KELUARGA.indexOf(h)
      const anggota = db.penduduk
        .filter((p) => p.keluargaId === kk.id && p.statusDasar === 'Hidup')
        .sort((a, b) => urutan(a.hubunganKeluarga) - urutan(b.hubunganKeluarga) || a.tanggalLahir.localeCompare(b.tanggalLahir))
        .map((p) => ({
          id: p.id, nama: p.nama, nik: p.nik, jenisKelamin: p.jenisKelamin, tempatLahir: p.tempatLahir, tanggalLahir: p.tanggalLahir,
          hubunganKeluarga: p.hubunganKeluarga, agama: p.agama, golonganDarah: p.golonganDarah, pendidikan: p.pendidikan,
          pekerjaan: p.pekerjaan, statusPerkawinan: p.statusPerkawinan, namaAyah: p.namaAyah, namaIbu: p.namaIbu, telepon: p.telepon,
          umurBulan: hitungUmur(p.tanggalLahir, sekarang).bulan,
        }))
      const laporan = db.laporanData
        .filter((l) => l.pelapor.pendudukId === w.penduduk.id)
        .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada))
        .flatMap((l) => keLaporanWarga(db, l) ?? [])
      const isi: KeluargaWarga = {
        nomorKk: kk.nomorKk,
        alamat: `${alamatLengkap(kk, db.dusun.filter((d) => d.desaId === desa.id), desa.istilahWilayah)}, Desa ${desa.nama}`,
        anggota,
        laporan,
      }
      return HttpResponse.json(isi)
    }),
  ),
  http.post(
    `${API}/warga/laporan-data`,
    denganJaringan(async ({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const { data, berkas } = await bacaMultipart(request)
      const masukan = kirimLaporanWargaSchema.safeParse(data)
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const m = masukan.data
      const db = ambilDb()
      const lama = kirimanSebelumnya(db, w.penduduk.id, 'laporan', m.kunci)
      const sudahAda = lama ? db.laporanData.find((x) => x.id === lama.rujukanId) : undefined
      const laporanLama = sudahAda ? keLaporanWarga(db, sudahAda) : null
      if (laporanLama) return HttpResponse.json(laporanLama)

      // Hanya anggota KK sendiri yang masih hidup (fokus review 3).
      const p = db.penduduk.find((x) => x.id === m.pendudukId && x.keluargaId === w.penduduk.keluargaId && x.statusDasar === 'Hidup')
      if (!p) return balasField('pendudukId', 'Pilih anggota keluarga Anda sendiri.')
      const sekarang = new Date()
      const galatNilai = periksaNilaiLaporan(m.field, m.nilaiBaru, p[m.field], tanggalIsoWib(sekarang))
      if (galatNilai) return balasField('nilaiBaru', galatNilai)
      const masihDitinjau = db.laporanData.some(
        (l) => l.status === 'baru' && l.isi.jenis === 'perbaikan' && l.isi.pendudukId === p.id && l.isi.field === m.field,
      )
      if (masihDitinjau) return balasGalat('CONFLICT', 'Laporan untuk data ini masih ditinjau kantor desa.', 409)
      const daftarFoto = berkas('foto')
      const foto = daftarFoto[0] ?? null
      if (daftarFoto.length > 1) return balasField('foto', 'Lampirkan satu foto dokumen saja.')
      if (foto) {
        const g = periksaFotoKirim(foto)
        if (g) return balasField('foto', g)
      }
      const waktu = waktuIsoWib(sekarang)
      const isi: IsiPerbaikan = {
        jenis: 'perbaikan', pendudukId: p.id, field: m.field, nilaiBaru: m.nilaiBaru, catatan: m.catatan ? m.catatan : null,
      }
      const laporan: LaporanData = {
        id: idBaru(db, 'lap'), desaId: p.desaId, dusunId: p.dusunId, dibuatPada: waktu,
        pelapor: { pendudukId: w.penduduk.id, nama: w.penduduk.nama }, status: 'baru', ditangani: null,
        lampiran: foto ? { berkas: foto.name, ukuranKb: ukuranKb(foto.size) } : null, isi,
      }
      ubahDb((d) => {
        d.laporanData.push(laporan)
        catatKiriman(d, { kunci: m.kunci, pendudukId: w.penduduk.id, jenis: 'laporan', rujukanId: laporan.id })
        kirimNotifikasi(d, {
          desaId: p.desaId, untuk: 'penduduk.ubah', kecuali: null, jenis: 'laporan-data', judul: `Laporan perbaikan data dari ${w.penduduk.nama}`,
          isi: `${LABEL_FIELD[isi.field]} ${p.nama} seharusnya ${teksNilaiRiwayat(isi.field, isi.nilaiBaru)}.`, waktu, rujukan: { jenis: 'penduduk', id: p.id },
        })
      })
      return HttpResponse.json(keLaporanWarga(ambilDb(), laporan), { status: 201 })
    }),
  ),
]
