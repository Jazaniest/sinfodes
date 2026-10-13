import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { JenisSurat } from '@/domain/surat/jenis'
import type { Permohonan } from '@/domain/surat/permohonan'
import { periksaJenisSurat, ubahJenisSuratSchema, type DetailJenisSurat } from '@/domain/surat/ubah-jenis'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'
import { hitungPakai, namaPejabat, pengaturanDesa } from './surat'

const TIDAK_DITEMUKAN = 'Jenis surat tidak ditemukan.'

/**
 * Pemohon tiruan untuk pratinjau di desa yang belum punya penduduk (tahap 6C). Tanpa NIK dan tanpa data desa lain, jadi
 * pratinjau tidak pernah menampilkan data pribadi siapa pun.
 */
function pemohonContoh(desaId: string): Penduduk {
  const waktu = waktuIsoWib(new Date())
  return {
    id: 'pemohon-contoh', desaId, nik: null, nama: 'Nama Pemohon', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu', agama: 'Islam',
    kewarganegaraan: 'WNI', tempatLahir: 'Tempat Lahir', tanggalLahir: '1990-01-01', nomorAktaLahir: null, keluargaId: '',
    hubunganKeluarga: 'Kepala Keluarga', namaAyah: '', namaIbu: '', dusunId: '', rw: '001', rt: '001', pendidikan: null,
    pekerjaan: null, statusPerkawinan: null, statusDasar: 'Hidup', statusPenduduk: 'Tetap', ktpEl: 'Belum rekam', telepon: null,
    catatan: null, dibuatPada: waktu, diubahPada: waktu,
  }
}

/**
 * Jenis surat beserta bahan pratinjau halaman ubah. Contohnya permohonan terakhir jenis ini (pemohon, bayi/almarhum,
 * mutasi, dan isiannya), supaya pratinjau tampak seperti surat sungguhan. Desa yang belum punya penduduk memakai pemohon
 * contoh (tahap 6C).
 */
function detailJenis(db: DbDemo, jenis: JenisSurat, permohonan: readonly Permohonan[]): DetailJenisSurat {
  const terakhir = permohonan.filter((p) => p.jenisId === jenis.id).sort((a, b) => b.masukPada.localeCompare(a.masukPada))[0]
  const orang = (id: string | null | undefined) => (id ? (db.penduduk.find((p) => p.id === id) ?? null) : null)
  const pemohon =
    orang(terakhir?.pemohonId) ??
    db.penduduk.find((p) => p.desaId === jenis.desaId && p.statusDasar === 'Hidup' && p.hubunganKeluarga === 'Kepala Keluarga')
  return {
    jenis: { ...jenis, jumlahPakai: hitungPakai(permohonan).get(jenis.id) ?? 0 },
    contoh: {
      pemohon: pemohon ?? pemohonContoh(jenis.desaId),
      tiruan: !pemohon,
      subjek: orang(terakhir?.subjekId),
      mutasi: terakhir?.mutasiId ? (db.mutasi.find((m) => m.id === terakhir.mutasiId) ?? null) : null,
      isian: terakhir?.isian ?? {},
    },
    pengaturan: pengaturanDesa(db, jenis.desaId),
    pejabat: namaPejabat(db, jenis.desaId),
  }
}

/** Halaman Jenis Surat (SPEC §7.4 layar 6). Daftarnya tetap di `GET /jenis-surat` (handlerSurat). */
export const handlerJenisSurat = [
  http.get(
    `${API}/jenis-surat/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'surat.lihat', 'Peran Anda tidak berhak membuka Layanan Surat.')
      if (pengguna instanceof Response) return pengguna
      const { db, jenisSurat, permohonan } = dataMilik(pengguna)
      const jenis = jenisSurat.find((j) => j.id === String(params.id))
      if (!jenis) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      return HttpResponse.json(detailJenis(db, jenis, permohonan))
    }),
  ),
  http.patch(
    `${API}/jenis-surat/:id`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'pengaturan.kelola', 'Peran Anda tidak berhak mengubah jenis surat.')
      if (pengguna instanceof Response) return pengguna
      const masukan = ubahJenisSuratSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const { db, jenisSurat, permohonan } = dataMilik(pengguna)
      const lama = jenisSurat.find((j) => j.id === String(params.id))
      if (!lama) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const m = masukan.data
      const baru: JenisSurat = {
        ...lama,
        ...m,
        nama: (m.nama ?? lama.nama).trim(),
        klasifikasi: (m.klasifikasi ?? lama.klasifikasi).trim(),
        syarat: (m.syarat ?? lama.syarat).map((s) => s.trim()),
        isian: (m.isian ?? lama.isian).map((d) => ({
          ...d,
          label: d.label.trim(),
          pilihan: d.jenis === 'pilihan' ? (d.pilihan ?? []).map((p) => p.trim()).filter((p) => p !== '') : null,
        })),
      }
      const galat = periksaJenisSurat(baru)
      if (Object.keys(galat).length > 0) return balasGalat('VALIDATION', 'Jenis surat belum bisa disimpan.', 422, galat)
      ubahDb((d) => {
        const i = d.jenisSurat.findIndex((j) => j.id === lama.id)
        d.jenisSurat[i] = baru
      })
      return HttpResponse.json(detailJenis(db, baru, permohonan))
    }),
  ),
]
