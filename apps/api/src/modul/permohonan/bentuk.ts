import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { barisPermohonanSchema, permohonanSchema, type BarisPermohonan, type Permohonan } from '@sinfodes/kontrak/surat/permohonan'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { RekamBaris, RekamPermohonan, RekamRiwayatSurat } from './repositori'

export const PESAN_DATA_TIDAK_UTUH = 'Data permohonan tidak utuh.'
const dataTidakUtuh = () => new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)

const waktuAtauNull = (w: Date | null): string | null => (w === null ? null : waktuIsoWib(w))

/**
 * Baris `permohonan` beserta riwayatnya menjadi `Permohonan` kontrak. Isian dan lembar beku dibuka dari sandi (ruang memuat
 * desa pemilik baris). Bentuk jsonb dan enumerasi dipercaya dari basis data lalu diperiksa skema: data yang menyimpang
 * gagal tertutup (500) dan tidak sampai ke klien.
 */
export function bentukPermohonan(b: RekamPermohonan, riwayat: readonly RekamRiwayatSurat[], penyandi: Penyandi): Permohonan {
  const terbit =
    b.terbitNomor === null
      ? null
      : {
          nomor: b.terbitNomor,
          tahun: b.terbitTahun,
          urut: b.terbitUrut,
          kodeVerifikasi: b.terbitKode,
          pada: waktuAtauNull(b.terbitPada),
          penandatangan: b.terbitPenandatangan,
          mode: b.terbitMode,
          berlakuSampai: b.terbitBerlakuSampai,
          lembar: b.terbitLembarSandi === null ? null : JSON.parse(penyandi.bukaSandi(b.terbitLembarSandi, ruang.permohonanLembar(b.desaId))),
          tataLetak: b.terbitTataLetak,
          kop: b.terbitKop,
        }
  const hasil = permohonanSchema.safeParse({
    id: b.id,
    desaId: b.desaId,
    dusunId: b.dusunId,
    noUrut: b.noUrut,
    jenisId: b.jenisId,
    kanal: b.kanal,
    pemohonId: b.pemohonId,
    subjekId: b.subjekId,
    mutasiId: b.mutasiId,
    isian: JSON.parse(penyandi.bukaSandi(b.isianSandi, ruang.permohonanIsian(b.desaId))),
    status: b.status,
    tahap: b.tahap,
    dikembalikan: b.dikembalikan,
    penolakan: b.penolakan,
    pembatalan: b.pembatalan,
    diambil: b.diambil,
    masukPada: waktuIsoWib(b.masukPada),
    ditutupPada: waktuAtauNull(b.ditutupPada),
    lampiran: b.lampiran,
    catatanInternal: b.catatanInternal,
    riwayat: riwayat.map((r) => ({ id: r.id, kejadian: r.kejadian, waktu: waktuIsoWib(r.waktu), oleh: r.oleh, catatan: r.catatan })),
    terbit,
  })
  if (!hasil.success) throw dataTidakUtuh()
  return hasil.data
}

/** Baris daftar: NIK pemohon dibuka dari sandi hanya untuk baris yang benar-benar dikirim. */
export function bentukBaris(b: RekamBaris, penyandi: Penyandi): BarisPermohonan {
  const hasil = barisPermohonanSchema.safeParse({
    id: b.id,
    noUrut: b.noUrut,
    status: b.status,
    tahap: b.tahap,
    dikembalikan: b.dikembalikan,
    kanal: b.kanal,
    masukPada: waktuIsoWib(b.masukPada),
    ditutupPada: waktuAtauNull(b.ditutupPada),
    jenis: { id: b.jenisId, kode: b.jenisKode, nama: b.jenisNama },
    pemohon: { id: b.pemohonId, nama: b.pemohonNama, nik: b.pemohonNikSandi === null ? null : penyandi.bukaSandi(b.pemohonNikSandi, ruang.nik(b.desaId)) },
    nomor: b.nomor,
  })
  if (!hasil.success) throw dataTidakUtuh()
  return hasil.data
}
