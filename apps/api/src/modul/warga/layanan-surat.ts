import { hitungUmur, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { HUBUNGAN_KELUARGA } from '@sinfodes/kontrak/penduduk/enum'
import { dilayani } from '@sinfodes/kontrak/surat/jenis'
import { rataHariKerja } from '@sinfodes/kontrak/surat/waktu'
import { jenisSuratWargaSchema, type JenisSuratWarga } from '@sinfodes/kontrak/warga/ajukan'
import { keluargaWargaSchema, type KeluargaWarga, type LaporanWarga } from '@sinfodes/kontrak/warga/keluarga'
import type { DetailPermohonanWarga, RingkasPermohonanWarga } from '@sinfodes/kontrak/warga/permohonan'
import { alamatLengkap } from '@sinfodes/kontrak/wilayah/alamat'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { daftarDusunDesa } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { bacaJenisDesa, bacaJenisSatu } from '../jenis-surat/repositori'
import { bentukLaporan } from '../laporan/layanan'
import { bacaLaporanPelapor } from '../laporan/repositori'
import { bentukPermohonan } from '../permohonan/bentuk'
import { PESAN_PERMOHONAN_TIDAK_ADA } from '../permohonan/layanan'
import { bacaContohSelesai, bacaPermohonanMilikWarga, bacaRingkasWarga, bacaRiwayatPermohonan } from '../permohonan/repositori'
import { bacaKeluargaSatu, bacaAnggotaHidup } from '../keluarga/repositori'
import { bentukPenduduk } from '../penduduk/layanan'
import { bacaPendudukSatu } from '../penduduk/repositori'
import { bentukDetailWarga, bentukRingkasWarga, dasarDariBaris, PESAN_SURAT_WARGA_TIDAK_UTUH } from './bentuk-surat'

export type KonteksWargaSurat = { db: Db; penyandi: Penyandi; desa: Desa; pendudukId: string; sekarang: Date }

const HARI_MS = 86_400_000
/** Jendela contoh perkiraan lama proses: surat Selesai 90 hari terakhir per jenis. */
const JENDELA_PERKIRAAN_HARI = 90
const DATA_KELUARGA_TIDAK_UTUH = 'Data keluarga tidak lengkap.'

/** Jenis surat yang boleh diajukan online beserta perkiraan lama prosesnya (SPEC §10). */
export async function daftarJenisWarga(k: KonteksWargaSurat): Promise<JenisSuratWarga[]> {
  const jenis = await bacaJenisDesa(k.db)
  const contoh = await bacaContohSelesai(k.db, new Date(k.sekarang.getTime() - JENDELA_PERKIRAAN_HARI * HARI_MS))
  const hasil = jenisSuratWargaSchema.array().safeParse(
    jenis
      .filter((j) => j.online && dilayani(j))
      .map((j) => ({
        id: j.id, kode: j.kode, nama: j.nama, subjek: j.subjek, isian: j.isian, syarat: j.syarat,
        perkiraanHariKerja: rataHariKerja(
          contoh.filter((c) => c.jenisId === j.id).map((c) => ({ masukPada: waktuIsoWib(c.masukPada), terbitPada: waktuIsoWib(c.terbitPada) })),
        ),
      })),
  )
  if (!hasil.success) throw new GalatApp('SERVER', PESAN_SURAT_WARGA_TIDAK_UTUH, 500)
  return hasil.data
}

/** Keluarga saya: anggota Hidup KK warga dan laporan perbaikan yang pernah dia kirim (SPEC §10). */
export async function keluargaWarga(k: KonteksWargaSurat): Promise<KeluargaWarga> {
  const diri = await bacaPendudukSatu(k.db, k.pendudukId, null)
  const kk = diri ? await bacaKeluargaSatu(k.db, diri.keluargaId, null) : undefined
  if (!diri || !kk) throw new GalatApp('SERVER', DATA_KELUARGA_TIDAK_UTUH, 500)

  const urutan = (h: string) => HUBUNGAN_KELUARGA.indexOf(h as (typeof HUBUNGAN_KELUARGA)[number])
  const rekamAnggota = (await bacaAnggotaHidup(k.db, kk.id, null)).sort(
    (a, b) => urutan(a.hubunganKeluarga) - urutan(b.hubunganKeluarga) || a.tanggalLahir.localeCompare(b.tanggalLahir),
  )
  const anggota = rekamAnggota.map((r) => {
    const p = bentukPenduduk(r, k.penyandi)
    return {
      id: p.id, nama: p.nama, nik: p.nik, jenisKelamin: p.jenisKelamin, tempatLahir: p.tempatLahir, tanggalLahir: p.tanggalLahir,
      hubunganKeluarga: p.hubunganKeluarga, agama: p.agama, golonganDarah: p.golonganDarah, pendidikan: p.pendidikan, pekerjaan: p.pekerjaan,
      statusPerkawinan: p.statusPerkawinan, namaAyah: p.namaAyah, namaIbu: p.namaIbu, telepon: p.telepon,
      umurBulan: hitungUmur(p.tanggalLahir, k.sekarang).bulan,
    }
  })

  const nama = new Map(rekamAnggota.map((r) => [r.id, r.nama]))
  const laporan: LaporanWarga[] = []
  for (const b of await bacaLaporanPelapor(k.db, k.pendudukId)) {
    const l = bentukLaporan(b, k.penyandi)
    if (l.isi.jenis !== 'perbaikan') continue
    const namaPenduduk = nama.get(l.isi.pendudukId) ?? (await bacaPendudukSatu(k.db, l.isi.pendudukId, null))?.nama ?? 'Penduduk tidak ditemukan'
    laporan.push({
      id: l.id, pendudukId: l.isi.pendudukId, namaPenduduk, field: l.isi.field, nilaiBaru: l.isi.nilaiBaru, status: l.status, dibuatPada: l.dibuatPada,
      alasanDitolak: l.status === 'ditolak' ? (l.ditangani?.alasan ?? null) : null,
    })
  }

  const hasil = keluargaWargaSchema.safeParse({
    nomorKk: k.penyandi.bukaSandi(kk.nomorKkSandi, ruang.nomorKk(kk.desaId)),
    alamat: `${alamatLengkap(kk, await daftarDusunDesa(k.db), k.desa.istilahWilayah)}, Desa ${k.desa.nama}`,
    anggota,
    laporan,
  })
  if (!hasil.success) throw new GalatApp('SERVER', DATA_KELUARGA_TIDAK_UTUH, 500)
  return hasil.data
}

/** Permohonan milik warga (sebagai pemohon atau pengaju), terbaru dulu, tanpa halaman seperti API tiruan. */
export async function daftarPermohonanWarga(k: KonteksWargaSurat): Promise<{ data: RingkasPermohonanWarga[]; meta: { page: number; pageSize: number; total: number } }> {
  const data = (await bacaRingkasWarga(k.db, k.pendudukId)).map((r) => bentukRingkasWarga(dasarDariBaris(r)))
  return { data, meta: { page: 1, pageSize: Math.max(data.length, 1), total: data.length } }
}

/** Detail satu permohonan. Milik orang lain, desa lain, dan yang tidak ada dijawab sama (404), supaya id tidak bisa ditebak. */
export async function detailPermohonanWarga(k: KonteksWargaSurat, id: string): Promise<DetailPermohonanWarga> {
  const rekam = await bacaPermohonanMilikWarga(k.db, id, k.pendudukId)
  if (!rekam) throw new GalatApp('NOT_FOUND', PESAN_PERMOHONAN_TIDAK_ADA, 404)
  const p = bentukPermohonan(rekam, await bacaRiwayatPermohonan(k.db, rekam.id), k.penyandi)
  const jenis = await bacaJenisSatu(k.db, rekam.jenisId)
  const untuk = await bacaPendudukSatu(k.db, rekam.subjekId ?? rekam.pemohonId, null)
  if (!jenis || !untuk) throw new GalatApp('SERVER', PESAN_SURAT_WARGA_TIDAK_UTUH, 500)
  return bentukDetailWarga(p, jenis, { id: untuk.id, nama: untuk.nama })
}
