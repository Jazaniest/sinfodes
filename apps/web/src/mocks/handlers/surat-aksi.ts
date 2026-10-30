import { http } from 'msw'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { samarkanTelepon } from '@/domain/format/telepon'
import type { Pelaku } from '@/domain/mutasi/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import { peranMengizinkan, statusMengizinkan, tahapAwalTtd } from '@/domain/surat/alur'
import { labelPenandatangan } from '@/domain/surat/arsip'
import { periksaIsian, saringIsian, samaIsian, type JenisSurat } from '@/domain/surat/jenis'
import { susunLembar } from '@/domain/surat/lembar'
import { formatNomorSurat, urutBerikutnya } from '@/domain/surat/nomor-surat'
import {
  AKSI_SURAT, ajukanTtdSchema, alasanSchema, catatanKembaliSchema, tandaTanganSchema, ubahPermohonanSchema,
  type AksiSurat, type KejadianSurat, type Permohonan,
} from '@/domain/surat/permohonan'
import { PESAN_PASSPHRASE_SALAH } from '@/domain/surat/passphrase'
import { tataLetakBerlaku } from '@/domain/surat/tata-letak-siap'
import { buatKodeVerifikasi } from '@/domain/surat/verifikasi'
import { berlakuSampai } from '@/domain/surat/waktu'
import { dataMilik } from '../cakupan'
import { PASSPHRASE_TTE_DEMO } from '@sinfodes/demo/data/desa-demo'
import { ubahDb } from '../db'
import { tolakBilaDitangguhkan } from '../penangguhan'
import { kirimNotifikasi } from '../notifikasi'
import { API, balasGalat, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { bacaJson, balasField, balasIsianTidakValid, butuhKemampuan, catatAktivitas, idBaru, pelakuDari } from '../tulis'
import { balasDetail, pengaturanDesa, PERMOHONAN_TIDAK_DITEMUKAN } from './surat'

const SUDAH_BERPINDAH = 'Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.'
const TIDAK_BERHAK: Readonly<Record<AksiSurat, string>> = {
  proses: 'Peran Anda tidak berhak memproses permohonan.',
  tolak: 'Peran Anda tidak berhak menolak permohonan.',
  'ajukan-ttd': 'Peran Anda tidak berhak mengajukan tanda tangan.',
  paraf: 'Hanya Sekretaris Desa yang memaraf surat.',
  kembalikan: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa mengembalikan surat.',
  tandatangani: 'Surat ini harus ditandatangani Kepala Desa.',
  batalkan: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa membatalkan surat.',
  'tandai-diambil': 'Peran Anda tidak berhak mengubah permohonan.',
  'kirim-wa': 'Peran Anda tidak berhak mengirim surat.',
}

export function catatRiwayatSurat(db: DbDemo, p: Permohonan, kejadian: KejadianSurat, oleh: Pelaku, waktu: string, catatan: string | null = null) {
  p.riwayat.push({ id: idBaru(db, 'rws'), kejadian, waktu, oleh, catatan })
}

/** Nomor surat berikutnya dan kode verifikasi baru (SPEC §7.2, §7.5). Nomor surat yang dibatalkan tetap terhitung. */
function nomorBaru(db: DbDemo, p: Permohonan, jenis: JenisSurat, tanggal: string, kodeDesa: string) {
  const pengaturan = pengaturanDesa(db, p.desaId)
  const kodeJenis = new Map(db.jenisSurat.map((j) => [j.id, j.kode]))
  const terpakai = db.permohonan.flatMap((x) =>
    x.desaId === p.desaId && x.terbit ? [{ tahun: x.terbit.tahun, urut: x.terbit.urut, jenisKode: kodeJenis.get(x.jenisId) ?? '' }] : [],
  )
  const tahun = Number(tanggal.slice(0, 4))
  const urut = urutBerikutnya(terpakai, { tahun, jenisKode: jenis.kode, mode: pengaturan.urutan })
  const kodeLama = new Set(db.permohonan.flatMap((x) => (x.terbit ? [x.terbit.kodeVerifikasi] : [])))
  let kode = buatKodeVerifikasi(kodeDesa, Math.random)
  while (kodeLama.has(kode)) kode = buatKodeVerifikasi(kodeDesa, Math.random)
  const nomor = formatNomorSurat(pengaturan.formatNomor, { klasifikasi: jenis.klasifikasi, kodeJenis: jenis.kode, urut, kodeDesa, tanggal })
  return { tahun, urut, nomor, kode, mode: pengaturan.modeTandaTangan }
}

export const handlerSuratAksi = [
  http.patch(
    `${API}/permohonan/:id`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'surat.proses', 'Peran Anda tidak berhak mengubah permohonan.')
      if (pengguna instanceof Response) return pengguna
      const masukan = ubahPermohonanSchema.safeParse(await bacaJson(request))
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      // Mulai di sini tidak ada `await`: pemeriksaan dan penulisan tidak bisa diselingi permintaan lain.
      const { db, permohonan } = dataMilik(pengguna)
      const p = permohonan.find((x) => x.id === String(params.id))
      if (!p) return balasGalat('NOT_FOUND', PERMOHONAN_TIDAK_DITEMUKAN, 404)
      const jenis = db.jenisSurat.find((j) => j.id === p.jenisId)
      if (!jenis) return balasGalat('SERVER', 'Data permohonan tidak utuh.', 500)
      const { isian, catatanInternal } = masukan.data
      if (isian !== undefined && p.status !== 'diproses') {
        return balasGalat('CONFLICT', 'Isian hanya bisa diubah saat permohonan berstatus Diproses.', 409)
      }
      const isianBaru = isian === undefined ? null : saringIsian(jenis, isian)
      const waktu = waktuIsoWib(new Date())
      ubahDb((d) => {
        if (isianBaru && !samaIsian(isianBaru, p.isian)) {
          p.isian = isianBaru
          catatRiwayatSurat(d, p, 'disimpan', pelakuDari(pengguna), waktu)
        }
        if (catatanInternal !== undefined) p.catatanInternal = catatanInternal || null
      })
      return balasDetail(db, p)
    }),
  ),
  http.post(
    `${API}/permohonan/:id/:aksi`,
    denganJaringan(async ({ request, params }) => {
      const aksi = AKSI_SURAT.find((a) => a === params.aksi)
      if (!aksi) return balasGalat('NOT_FOUND', 'Aksi tidak dikenal.', 404)
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      if (!boleh(pengguna.peran, 'surat.lihat')) return balasGalat('FORBIDDEN', 'Peran Anda tidak berhak membuka Layanan Surat.', 403)
      // Semua aksi surat mengubah permohonan, jadi desa yang Ditangguhkan tidak boleh menjalankannya (SPEC-V0.2 §10.5).
      const ditangguhkan = tolakBilaDitangguhkan(pengguna.desaId)
      if (ditangguhkan) return ditangguhkan
      const badan = (await bacaJson(request)) ?? {}
      // Mulai di sini tidak ada `await`: dua klik "Tanda tangani" tidak bisa sama-sama lolos pemeriksaan status.
      const { db, permohonan } = dataMilik(pengguna)
      const p = permohonan.find((x) => x.id === String(params.id))
      if (!p) return balasGalat('NOT_FOUND', PERMOHONAN_TIDAK_DITEMUKAN, 404)
      const jenis = db.jenisSurat.find((j) => j.id === p.jenisId)
      const pemohon = db.penduduk.find((x) => x.id === p.pemohonId)
      const desa = db.desa.find((x) => x.id === p.desaId)
      if (!jenis || !pemohon || !desa) return balasGalat('SERVER', 'Data permohonan tidak utuh.', 500)
      if (!peranMengizinkan(aksi, pengguna.peran, jenis)) return balasGalat('FORBIDDEN', TIDAK_BERHAK[aksi], 403)
      if (!statusMengizinkan(aksi, p)) return balasGalat('CONFLICT', SUDAH_BERPINDAH, 409)
      const oleh = pelakuDari(pengguna)
      const sekarang = new Date()
      const waktu = waktuIsoWib(sekarang)
      const rujukan = { jenis: 'permohonan' as const, id: p.id }

      switch (aksi) {
        case 'proses':
          ubahDb((d) => {
            p.status = 'diproses'
            catatRiwayatSurat(d, p, 'proses', oleh, waktu)
          })
          break
        case 'tolak': {
          const isian = alasanSchema.safeParse(badan)
          if (!isian.success) return balasIsianTidakValid(isian.error)
          ubahDb((d) => {
            Object.assign(p, { status: 'ditolak', tahap: null, ditutupPada: waktu })
            p.penolakan = { oleh, pada: waktu, catatan: isian.data.alasan }
            catatRiwayatSurat(d, p, 'tolak', oleh, waktu, isian.data.alasan)
            catatAktivitas(d, {
              desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'surat-ditolak',
              ringkasan: `Permohonan ditolak · ${jenis.kode} · ${pemohon.nama}`, oleh, rujukan,
            })
          })
          break
        }
        case 'ajukan-ttd': {
          const isian = ajukanTtdSchema.safeParse(badan)
          if (!isian.success) return balasIsianTidakValid(isian.error)
          const nilai = isian.data.isian === undefined ? p.isian : saringIsian(jenis, isian.data.isian)
          const galat = Object.entries(periksaIsian(jenis, nilai))
          if (galat.length > 0) {
            return balasGalat('VALIDATION', 'Isian surat belum lengkap.', 422, Object.fromEntries(galat.map(([k, v]) => [`isian.${k}`, v])))
          }
          ubahDb((d) => {
            Object.assign(p, { isian: nilai, status: 'perlu-ttd', tahap: tahapAwalTtd(jenis), dikembalikan: null })
            catatRiwayatSurat(d, p, 'ajukan-ttd', oleh, waktu)
          })
          break
        }
        case 'paraf':
          ubahDb((d) => {
            p.tahap = 'tanda-tangan'
            catatRiwayatSurat(d, p, 'paraf', oleh, waktu)
          })
          break
        case 'kembalikan': {
          const isian = catatanKembaliSchema.safeParse(badan)
          if (!isian.success) return balasIsianTidakValid(isian.error)
          ubahDb((d) => {
            Object.assign(p, { status: 'diproses', tahap: null })
            p.dikembalikan = { oleh, pada: waktu, catatan: isian.data.catatan }
            catatRiwayatSurat(d, p, 'kembalikan', oleh, waktu, isian.data.catatan)
            kirimNotifikasi(d, {
              desaId: p.desaId, untuk: 'surat.proses', kecuali: pengguna.id, jenis: 'surat-dikembalikan',
              judul: `${jenis.kode} · ${pemohon.nama} dikembalikan untuk diperbaiki`, isi: isian.data.catatan, waktu, rujukan,
            })
          })
          break
        }
        case 'tandatangani': {
          const isian = tandaTanganSchema.safeParse(badan)
          if (!isian.success) return balasIsianTidakValid(isian.error)
          // Jenis suratnya bisa diubah sesudah diajukan (mis. isian wajib baru): surat tidak boleh terbit dengan isian kosong.
          const kurang = Object.values(periksaIsian(jenis, p.isian))
          if (kurang.length > 0) {
            return balasGalat('VALIDATION', `Isian surat belum lengkap (${kurang.join(', ')}). Kembalikan ke operator untuk dilengkapi.`, 422)
          }
          if (isian.data.passphrase !== PASSPHRASE_TTE_DEMO) return balasField('passphrase', PESAN_PASSPHRASE_SALAH)
          const tanggal = tanggalIsoWib(sekarang)
          const { tahun, urut, nomor, kode, mode } = nomorBaru(db, p, jenis, tanggal, desa.kodeSurat)
          const lembar = susunLembar({
            jenis, isian: p.isian, pemohon,
            subjek: p.subjekId ? (db.penduduk.find((x) => x.id === p.subjekId) ?? null) : null,
            mutasi: p.mutasiId ? (db.mutasi.find((m) => m.id === p.mutasiId) ?? null) : null,
            desa, dusun: db.dusun.filter((x) => x.desaId === p.desaId), tanggal,
          })
          ubahDb((d) => {
            Object.assign(p, { status: 'selesai', tahap: null, ditutupPada: waktu })
            p.terbit = {
              nomor, tahun, urut, kodeVerifikasi: kode, pada: waktu,
              penandatangan: { id: pengguna.id, nama: pengguna.nama, peran: pengguna.peran === 'kades' ? 'kades' : 'sekdes', nip: pengguna.nip },
              mode, berlakuSampai: berlakuSampai(tanggal, jenis.masaBerlakuBulan), lembar,
              // Tata letak dan lambang dibekukan: mengganti keduanya kemudian tidak mengubah surat ini (SPEC-V0.2 12.2).
              tataLetak: structuredClone(tataLetakBerlaku(jenis, pengaturanDesa(db, p.desaId))),
              kop: { lambang: desa.lambang ?? null, lambangKabupaten: desa.lambangKabupaten ?? null },
            }
            catatRiwayatSurat(d, p, 'tandatangani', oleh, waktu, nomor)
            catatAktivitas(d, {
              desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'surat-terbit',
              ringkasan: `Surat terbit · ${jenis.kode} ${nomor} · ${pemohon.nama}`, oleh, rujukan,
            })
            kirimNotifikasi(d, {
              desaId: p.desaId, untuk: 'surat.proses', kecuali: pengguna.id, jenis: 'surat-ditandatangani',
              judul: `${jenis.kode} · ${pemohon.nama} ditandatangani`,
              isi: `Nomor ${nomor} · ${labelPenandatangan({ nama: pengguna.nama, peran: pengguna.peran === 'kades' ? 'kades' : 'sekdes' })}`,
              waktu, rujukan,
            })
          })
          break
        }
        case 'batalkan': {
          const isian = alasanSchema.safeParse(badan)
          if (!isian.success) return balasIsianTidakValid(isian.error)
          ubahDb((d) => {
            p.status = 'dibatalkan'
            p.pembatalan = { oleh, pada: waktu, catatan: isian.data.alasan }
            catatRiwayatSurat(d, p, 'batalkan', oleh, waktu, isian.data.alasan)
            catatAktivitas(d, {
              desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'surat-dibatalkan',
              ringkasan: `Surat dibatalkan · ${jenis.kode} ${p.terbit?.nomor ?? ''}`, oleh, rujukan,
            })
          })
          break
        }
        case 'tandai-diambil':
          ubahDb((d) => {
            p.diambil = { pada: waktu, oleh }
            catatRiwayatSurat(d, p, 'tandai-diambil', oleh, waktu)
          })
          break
        case 'kirim-wa': {
          const telepon = pemohon.telepon
          if (!telepon) return balasGalat('VALIDATION', 'Pemohon belum punya nomor WhatsApp. Tambahkan nomornya di profil penduduk.', 422)
          ubahDb((d) => catatRiwayatSurat(d, p, 'kirim-wa', oleh, waktu, `Ke ${samarkanTelepon(telepon)}`))
          break
        }
      }
      return balasDetail(db, p)
    }),
  ),
]
