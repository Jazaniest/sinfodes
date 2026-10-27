import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type { Penyandi } from '../kripto/penyandi'
import { ruang } from '../kripto/ruang'
import type { BarisSisip } from './peta-desa'

/** Nomor KK disandikan; indeks HMAC-nya menjaga keunikan per desa dan pencarian persis (SPEC-V0.3 §7.6). */
export const petaKeluarga = (db: DbDemo, penyandi: Penyandi): BarisSisip[] =>
  db.keluarga.map((k) => ({
    id: k.id,
    desa_id: k.desaId,
    nomor_kk_sandi: penyandi.sandikan(k.nomorKk, ruang.nomorKk(k.desaId)),
    nomor_kk_indeks: penyandi.indeks(k.nomorKk, ruang.nomorKk(k.desaId)),
    kepala_keluarga_id: k.kepalaKeluargaId,
    dusun_id: k.dusunId,
    rw: k.rw,
    rt: k.rt,
    tanggal_terbit: k.tanggalTerbit,
  }))

/** NIK dan telepon disandikan di aplikasi; hanya NIK yang diberi indeks (telepon tidak dicari persis). */
export const petaPenduduk = (db: DbDemo, penyandi: Penyandi): BarisSisip[] =>
  db.penduduk.map((p) => ({
    id: p.id,
    desa_id: p.desaId,
    nik_sandi: p.nik === null ? null : penyandi.sandikan(p.nik, ruang.nik(p.desaId)),
    nik_indeks: p.nik === null ? null : penyandi.indeks(p.nik, ruang.nik(p.desaId)),
    nama: p.nama,
    jenis_kelamin: p.jenisKelamin,
    golongan_darah: p.golonganDarah,
    agama: p.agama,
    kewarganegaraan: p.kewarganegaraan,
    tempat_lahir: p.tempatLahir,
    tanggal_lahir: p.tanggalLahir,
    nomor_akta_lahir: p.nomorAktaLahir,
    keluarga_id: p.keluargaId,
    hubungan_keluarga: p.hubunganKeluarga,
    nama_ayah: p.namaAyah,
    nama_ibu: p.namaIbu,
    dusun_id: p.dusunId,
    rw: p.rw,
    rt: p.rt,
    pendidikan: p.pendidikan,
    pekerjaan: p.pekerjaan,
    status_perkawinan: p.statusPerkawinan,
    status_dasar: p.statusDasar,
    status_penduduk: p.statusPenduduk,
    ktp_el: p.ktpEl,
    telepon_sandi: p.telepon === null ? null : penyandi.sandikan(p.telepon, ruang.telepon(p.desaId)),
    catatan: p.catatan,
    dibuat_pada: new Date(p.dibuatPada),
    diubah_pada: new Date(p.diubahPada),
  }))
