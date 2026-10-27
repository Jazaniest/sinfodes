import type { DbDemo } from '@sinfodes/demo/tipe-db'
import type { Penyandi } from '../kripto/penyandi'
import { ruang } from '../kripto/ruang'
import type { BarisSisip, PembuatJson } from './peta-desa'

/** Kabupaten mitra: identitas dan ringkasan surat penunjukan (isi PDF tidak disimpan di demo). */
export const petaKabupatenMitra = (sql: PembuatJson, db: DbDemo, dibuat: Date): BarisSisip[] =>
  db.kabupatenMitra.map((k) => ({
    kode: k.kode,
    nama: k.nama,
    label: k.label,
    provinsi_kode: k.provinsi.kode,
    provinsi_nama: k.provinsi.nama,
    bergabung: k.bergabung,
    surat_penunjukan: sql.json(k.suratPenunjukan as never),
    dibuat,
  }))

/** `hash[i]` milik `db.penggunaKabupaten[i]`: setiap akun mendapat garam sendiri. */
export const petaPenggunaKabupaten = (db: DbDemo, hash: readonly string[], dibuat: Date): BarisSisip[] =>
  db.penggunaKabupaten.map((p, i) => ({
    id: p.id,
    kabupaten_kode: p.kabupatenKode,
    nama: p.nama,
    jabatan: p.jabatan,
    peran: p.peran,
    email: p.email.toLowerCase(),
    aktif: p.aktif,
    kata_sandi_hash: hash[i],
    dibuat,
  }))

/** Akun Konsol semai tanpa TOTP (SPEC-V0.3 §8.4: akun Tim pertama didaftarkan pemilik lewat `db:akun-tim`). */
export const petaPenggunaKonsol = (db: DbDemo, hash: readonly string[], dibuat: Date): BarisSisip[] =>
  db.penggunaKonsol.map((p, i) => ({
    id: p.id,
    nama: p.nama,
    jabatan: p.jabatan,
    peran: p.peran,
    email: p.email.toLowerCase(),
    aktif: true,
    kata_sandi_hash: hash[i],
    totp_rahasia_sandi: null,
    totp_langkah_terakhir: null,
    dibuat,
  }))

/** PIN di-hash argon2id; nomor WhatsApp disandikan (ruang memuat desa pemilik akun). */
export const petaAkunWarga = (db: DbDemo, penyandi: Penyandi, hashPin: readonly string[], diubah: Date): BarisSisip[] =>
  db.akunWarga.map((a, i) => ({
    penduduk_id: a.pendudukId,
    desa_id: a.desaId,
    pin_hash: hashPin[i],
    whatsapp_sandi: penyandi.sandikan(a.whatsapp, ruang.whatsapp(a.desaId)),
    diubah,
  }))
