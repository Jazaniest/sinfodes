import { http, HttpResponse } from 'msw'
import { waktuIsoWib } from '@/domain/format/tanggal'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { bolehDiarsipkan, bolehDihapus, jenisKosong, salinJenis, tambahJenisSchema, type JenisSurat } from '@/domain/surat/jenis'
import type { Permohonan } from '@/domain/surat/permohonan'
import { samaDenganSiap } from '@/domain/surat/tata-letak-siap'
import { periksaJenisSurat, ubahJenisSuratSchema, type DetailJenisSurat } from '@/domain/surat/ubah-jenis'
import { dataMilik } from '../cakupan'
import { ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, butuhKemampuan, idBaru } from '../tulis'
import { hitungPakai, idJenisDipakai, namaPejabat, pengaturanDesa } from './surat'

const TIDAK_DITEMUKAN = 'Jenis surat tidak ditemukan.'
const PESAN_BAWAAN = 'Jenis bawaan tidak bisa dihapus atau diarsipkan.'
const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak mengubah jenis surat.'

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
    jenis: { ...jenis, jumlahPakai: hitungPakai(permohonan).get(jenis.id) ?? 0, dipakai: idJenisDipakai(db, jenis.desaId).has(jenis.id) },
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

/** Jenis surat milik desa pengguna, atau balasan 404. Sama untuk hapus, arsipkan, dan aktifkan lagi. */
function jenisMilik(pengguna: PenggunaSesi, id: string) {
  const { db, jenisSurat } = dataMilik(pengguna)
  const jenis = jenisSurat.find((j) => j.id === id)
  return jenis ? { db, jenis } : balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
}

/** Tambah, hapus, arsipkan, dan aktifkan lagi jenis surat buatan desa (SPEC-V0.2 12.1). Semuanya `pengaturan.kelola`. */
const handlerJenisSuratDesa = [
  http.post(
    `${API}/jenis-surat`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhKemampuan(request, 'pengaturan.kelola', PESAN_TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      const masukan = tambahJenisSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const { db, jenisSurat } = dataMilik(pengguna)
      const m = masukan.data
      const sumber = m.dari === null ? null : jenisSurat.find((j) => j.id === m.dari)
      if (m.dari !== null && !sumber) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      // Kode unik per desa, termasuk terhadap jenis arsip (keputusan 7).
      if (jenisSurat.some((j) => j.kode === m.kode)) return balasField('kode', 'Kode sudah dipakai jenis surat lain.')
      const isi = sumber ? salinJenis(sumber, m.kode, m.nama) : jenisKosong({ id: pengguna.desaId }, m.kode, m.nama)
      const baru: JenisSurat = { ...isi, id: idBaru(db, 'js') }
      ubahDb((d) => {
        d.jenisSurat.push(baru)
      })
      return HttpResponse.json(baru, { status: 201 })
    }),
  ),
  http.delete(
    `${API}/jenis-surat/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'pengaturan.kelola', PESAN_TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      const ada = jenisMilik(pengguna, String(params.id))
      if (ada instanceof Response) return ada
      const { db, jenis } = ada
      if (jenis.asal === 'bawaan') return balasGalat('VALIDATION', PESAN_BAWAAN, 422)
      if (!bolehDihapus(jenis, idJenisDipakai(db, pengguna.desaId).has(jenis.id))) {
        return balasGalat('CONFLICT', 'Jenis ini sudah pernah dipakai. Arsipkan saja.', 409)
      }
      ubahDb((d) => {
        d.jenisSurat = d.jenisSurat.filter((j) => j.id !== jenis.id)
      })
      return HttpResponse.json({ id: jenis.id })
    }),
  ),
  http.post(
    `${API}/jenis-surat/:id/arsipkan`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'pengaturan.kelola', PESAN_TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      const ada = jenisMilik(pengguna, String(params.id))
      if (ada instanceof Response) return ada
      const { jenis } = ada
      if (jenis.asal === 'bawaan') return balasGalat('VALIDATION', PESAN_BAWAAN, 422)
      if (!bolehDiarsipkan(jenis)) return balasGalat('CONFLICT', 'Jenis ini sudah diarsipkan.', 409)
      // Permohonan yang sedang berjalan tidak disentuh: arsip hanya menutup pembuatan permohonan baru (fokus review 1).
      const baru: JenisSurat = { ...jenis, aktif: false, diarsipkan: waktuIsoWib(new Date()) }
      ubahDb((d) => {
        d.jenisSurat[d.jenisSurat.findIndex((j) => j.id === jenis.id)] = baru
      })
      return HttpResponse.json(baru)
    }),
  ),
  http.post(
    `${API}/jenis-surat/:id/aktifkan-lagi`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'pengaturan.kelola', PESAN_TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      const ada = jenisMilik(pengguna, String(params.id))
      if (ada instanceof Response) return ada
      const { jenis } = ada
      if (jenis.diarsipkan === null) return balasGalat('CONFLICT', 'Jenis ini tidak sedang diarsipkan.', 409)
      // Tetap mati: desa menyalakan layanannya sendiri (keputusan 4).
      const baru: JenisSurat = { ...jenis, aktif: false, diarsipkan: null }
      ubahDb((d) => {
        d.jenisSurat[d.jenisSurat.findIndex((j) => j.id === jenis.id)] = baru
      })
      return HttpResponse.json(baru)
    }),
  ),
]

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
      const pengguna = butuhKemampuan(request, 'pengaturan.kelola', PESAN_TIDAK_BERHAK)
      if (pengguna instanceof Response) return pengguna
      const masukan = ubahJenisSuratSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const { db, jenisSurat, permohonan } = dataMilik(pengguna)
      const lama = jenisSurat.find((j) => j.id === String(params.id))
      if (!lama) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      if (lama.diarsipkan !== null) return balasGalat('CONFLICT', 'Jenis ini diarsipkan. Aktifkan lagi sebelum mengubahnya.', 409)
      const m = masukan.data
      const baru: JenisSurat = {
        ...lama,
        ...m,
        tataLetak: m.tataLetak === undefined ? lama.tataLetak : m.tataLetak && { ...m.tataLetak, siap: samaDenganSiap(m.tataLetak) },
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
  ...handlerJenisSuratDesa,
]
