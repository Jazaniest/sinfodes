import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { cocokPenduduk } from '@sinfodes/kontrak/penduduk/cari'
import { saringPenduduk, urutkanPenduduk, type FilterPenduduk } from '@sinfodes/kontrak/penduduk/filter'
import { barisPendudukSchema, type BarisPenduduk, type Penduduk, type RingkasanPenduduk } from '@sinfodes/kontrak/penduduk/schema'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { daftarDusunDesa } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { Pelaku } from '../../lapisan/konteks'
import { bacaKeluargaDesa, bacaPendudukDesa, hitungRingkasan, type RekamPenduduk } from './repositori'

export type KonteksLayanan = { db: Db; penyandi: Penyandi; pelaku: Pelaku; hariIni: Date }
export type HasilDaftar = { data: BarisPenduduk[]; meta: { page: number; pageSize: number; total: number } }

/**
 * Baris basis data menjadi `Penduduk` kontrak: NIK dan telepon dibuka dari sandi (ruang memuat desa pemilik baris). Bentuk
 * enumerasi dipercaya dari basis data di sini dan diperiksa skema pada baris yang benar-benar dikirim.
 */
export function bentukPenduduk(b: RekamPenduduk, penyandi: Penyandi): Penduduk {
  return {
    id: b.id,
    desaId: b.desaId,
    nik: b.nikSandi === null ? null : penyandi.bukaSandi(b.nikSandi, ruang.nik(b.desaId)),
    nama: b.nama,
    jenisKelamin: b.jenisKelamin as Penduduk['jenisKelamin'],
    golonganDarah: b.golonganDarah as Penduduk['golonganDarah'],
    agama: b.agama as Penduduk['agama'],
    kewarganegaraan: b.kewarganegaraan as Penduduk['kewarganegaraan'],
    tempatLahir: b.tempatLahir,
    tanggalLahir: b.tanggalLahir,
    nomorAktaLahir: b.nomorAktaLahir,
    keluargaId: b.keluargaId,
    hubunganKeluarga: b.hubunganKeluarga as Penduduk['hubunganKeluarga'],
    namaAyah: b.namaAyah,
    namaIbu: b.namaIbu,
    dusunId: b.dusunId,
    rw: b.rw,
    rt: b.rt,
    pendidikan: b.pendidikan as Penduduk['pendidikan'],
    pekerjaan: b.pekerjaan as Penduduk['pekerjaan'],
    statusPerkawinan: b.statusPerkawinan as Penduduk['statusPerkawinan'],
    statusDasar: b.statusDasar as Penduduk['statusDasar'],
    statusPenduduk: b.statusPenduduk as Penduduk['statusPenduduk'],
    ktpEl: b.ktpEl as Penduduk['ktpEl'],
    telepon: b.teleponSandi === null ? null : penyandi.bukaSandi(b.teleponSandi, ruang.telepon(b.desaId)),
    catatan: b.catatan,
    dibuatPada: waktuIsoWib(b.dibuatPada),
    diubahPada: waktuIsoWib(b.diubahPada),
  }
}

/**
 * Penduduk sesuai filter dan kata cari, sudah diurutkan, dipotong halaman, lengkap dengan nomor KK. Semua baris desa (atau
 * dusun, untuk Kepala Dusun) dibuka dari sandi lalu disaring di aplikasi dengan fungsi kontrak yang sama dengan API tiruan;
 * pencarian potongan nomor KK dan NIK tetap menemukan seluruh anggota walau terenkripsi.
 */
export async function daftarPenduduk(k: KonteksLayanan, filter: FilterPenduduk, kata: string | null): Promise<HasilDaftar> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const [rekam, rekamKk, dusun] = await Promise.all([bacaPendudukDesa(k.db, dusunSaja), bacaKeluargaDesa(k.db, dusunSaja), daftarDusunDesa(k.db)])
  const nomorKkPerId = new Map(rekamKk.map((r) => [r.id, k.penyandi.bukaSandi(r.nomorKkSandi, ruang.nomorKk(r.desaId))] as const))
  const nomorKk = (p: Penduduk): string => nomorKkPerId.get(p.keluargaId) ?? ''

  // Urutan awal ditetapkan menurut ID (perbandingan kode, bukan kolasi basis data): baris yang kunci urutnya sama (mis. nama
  // kembar) tetap berurutan tetap, jadi halaman tidak bergeser antarpermintaan. Perbedaan sengaja dari API tiruan, yang
  // mengurutkan baris kembar menurut urutan pembangkitan data demo.
  const semua = rekam.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((r) => bentukPenduduk(r, k.penyandi))
  const calon = kata === null ? semua : semua.filter((p) => cocokPenduduk(p, kata, nomorKk(p)))
  const tersaring = saringPenduduk(calon, filter, {
    hariIni: k.hariIni,
    dusunIdPerNomor: new Map(dusun.map((d) => [d.nomor, d.id] as const)),
    // Perbedaan sengaja: "pendatang tahun ini" bergantung pada tabel mutasi (8E); rute menolak preset itu sebelum sampai sini.
    idPendatangTahunIni: new Set<string>(),
  })
  const nomorDusun = (id: string): number => dusun.find((d) => d.id === id)?.nomor ?? Number.MAX_SAFE_INTEGER
  const urut = urutkanPenduduk(tersaring, filter.urut, { nomorDusun })

  const mulai = (filter.page - 1) * filter.pageSize
  const halaman = urut.slice(mulai, mulai + filter.pageSize).map((p) => ({ ...p, nomorKk: nomorKk(p) }))
  return { data: barisPendudukSchema.array().parse(halaman), meta: { page: filter.page, pageSize: filter.pageSize, total: urut.length } }
}

export async function ringkasanPenduduk(k: Pick<KonteksLayanan, 'db' | 'pelaku'>): Promise<RingkasanPenduduk> {
  const r = await hitungRingkasan(k.db, cakupanDusun(k.pelaku))
  return { jiwa: r.jiwa, kk: r.kk, diperbaruiPada: r.diperbarui === null ? null : waktuIsoWib(r.diperbarui) }
}
