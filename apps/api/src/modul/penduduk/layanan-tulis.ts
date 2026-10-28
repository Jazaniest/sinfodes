import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { cekNikSchema, hasilCekNikSchema, masukanPendudukSchema, ubahPendudukSchema, type HasilCekNik } from '@sinfodes/kontrak/penduduk/masukan'
import { daftarPerubahan } from '@sinfodes/kontrak/penduduk/perubahan'
import { LABEL_FIELD } from '@sinfodes/kontrak/penduduk/riwayat'
import { pendudukSchema, type Penduduk } from '@sinfodes/kontrak/penduduk/schema'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { randomUUID } from 'node:crypto'
import { daftarDusunDesa } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import { pelanggaranUnik } from '../../basisdata/galat-pg'
import { galatField, galatIsian } from '../../galat-isian'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { PelakuPanel } from '../../lapisan/konteks'
import { catatAktivitas, catatRiwayat, pelakuKontrak } from '../../riwayat/catat'
import { nomorKkBaru } from '../keluarga/nomor'
import { wilayahSah } from '../keluarga/wilayah-sah'
import { bentukPenduduk, PESAN_PENDUDUK_TIDAK_ADA } from './layanan'
import { bacaPendudukSatu } from './repositori'
import {
  cariPemilikNik, INDEKS_KK, INDEKS_NIK, kunciKeluarga, perbaruiPenduduk, sisipKeluarga, sisipPenduduk, urutanBerikutnya,
  type PerubahanPenduduk,
} from './repositori-tulis'

export type KonteksTulis = { db: Db; penyandi: Penyandi; pelaku: PelakuPanel; desa: Desa; sekarang: Date }

const LEWAT_HARI_INI = 'Tanggal lahir tidak boleh setelah hari ini'
const pesanNikGanda = (nama: string): string => `NIK sudah terdaftar atas nama ${nama}`

/**
 * Apakah NIK sudah terdaftar di desa ini (termasuk mantan penduduk)? Keunikan per desa, bukan nasional: indeks HMAC NIK
 * hidup di ruang desa dan RLS menutup desa lain (rencana 8E1 Ruling 2). Perbedaan sengaja dari API tiruan.
 */
export async function cekNik(k: Pick<KonteksTulis, 'db' | 'penyandi' | 'desa'>, mentah: unknown): Promise<HasilCekNik> {
  const isian = cekNikSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const pemilik = await cariPemilikNik(k.db, k.penyandi.indeks(isian.data.nik, ruang.nik(k.desa.id)), isian.data.kecualiId)
  return hasilCekNikSchema.parse({ terdaftar: pemilik !== undefined, penduduk: pemilik ?? null })
}

/**
 * Menambah penduduk ke KK yang ada atau ke KK baru (SPEC-V0.2 §6.4). Alamat penduduk selalu mengikuti KK; status dasar
 * Hidup. Penduduk, KK baru, aktivitas, dan nomor KK dibuat dalam satu transaksi permintaan.
 */
export async function tambahPenduduk(k: KonteksTulis, mentah: unknown): Promise<Penduduk> {
  const isian = masukanPendudukSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const { keluarga: tempat, ...bio } = isian.data
  if (bio.tanggalLahir > tanggalIsoWib(k.sekarang)) throw galatField('tanggalLahir', LEWAT_HARI_INI)

  const nikIndeks = bio.nik === null ? null : k.penyandi.indeks(bio.nik, ruang.nik(k.desa.id))
  if (nikIndeks !== null) {
    const pemilik = await cariPemilikNik(k.db, nikIndeks)
    if (pemilik) throw galatField('nik', pesanNikGanda(pemilik.nama), 'CONFLICT')
  }

  const id = `pdk_${randomUUID()}`
  let tujuan: { id: string; dusunId: string; rw: string; rt: string }
  let urutanKk = 0
  if (tempat.jenis === 'ada') {
    const kk = await kunciKeluarga(k.db, tempat.id, cakupanDusun(k.pelaku))
    if (!kk) throw galatField('keluarga', 'KK tidak ditemukan')
    if (bio.hubunganKeluarga === 'Kepala Keluarga') throw galatField('hubunganKeluarga', 'KK ini sudah punya kepala keluarga. Gantilah lewat halaman KK.')
    tujuan = kk
    urutanKk = await urutanBerikutnya(k.db, kk.id)
  } else {
    if (bio.hubunganKeluarga !== 'Kepala Keluarga') throw galatField('hubunganKeluarga', 'Penduduk pertama di KK baru adalah kepala keluarga')
    if (!wilayahSah(await daftarDusunDesa(k.db), tempat.dusunId, tempat.rw, tempat.rt)) throw galatField('dusunId', 'Wilayah tidak dikenal')
    const nomor = await nomorKkBaru(k.db, k.desa, k.penyandi, k.sekarang)
    tujuan = { id: `kk_${randomUUID()}`, dusunId: tempat.dusunId, rw: tempat.rw, rt: tempat.rt }
    // Kunci asing kepala keluarga ditunda sampai transaksi selesai, jadi KK boleh lebih dulu daripada kepalanya.
    await sisipKeluarga(k.db, {
      id: tujuan.id,
      desaId: k.desa.id,
      nomorKkSandi: k.penyandi.sandikan(nomor, ruang.nomorKk(k.desa.id)),
      nomorKkIndeks: k.penyandi.indeks(nomor, ruang.nomorKk(k.desa.id)),
      kepalaKeluargaId: id,
      dusunId: tempat.dusunId,
      rw: tempat.rw,
      rt: tempat.rt,
      tanggalTerbit: tanggalIsoWib(k.sekarang),
    })
  }

  let rekam
  try {
    rekam = await sisipPenduduk(k.db, {
      ...bio,
      id,
      desaId: k.desa.id,
      nikSandi: bio.nik === null ? null : k.penyandi.sandikan(bio.nik, ruang.nik(k.desa.id)),
      nikIndeks,
      teleponSandi: bio.telepon === null ? null : k.penyandi.sandikan(bio.telepon, ruang.telepon(k.desa.id)),
      keluargaId: tujuan.id,
      dusunId: tujuan.dusunId,
      rw: tujuan.rw,
      rt: tujuan.rt,
      statusDasar: 'Hidup',
      urutanKk,
      dibuatPada: k.sekarang,
      diubahPada: k.sekarang,
    })
  } catch (e) {
    // Dua operator memasukkan NIK yang sama bersamaan: yang kalah di indeks unik mendapat 409, bukan 500.
    if (pelanggaranUnik(e, INDEKS_NIK)) throw galatField('nik', 'NIK sudah terdaftar', 'CONFLICT')
    if (pelanggaranUnik(e, INDEKS_KK)) throw new GalatApp('CONFLICT', 'Nomor KK baru bertabrakan. Ulangi permintaan.', 409)
    throw e
  }
  await catatAktivitas(k.db, {
    desaId: k.desa.id, dusunId: rekam.dusunId, waktu: waktuIsoWib(k.sekarang), jenis: 'penduduk-tambah',
    ringkasan: `Penduduk ditambahkan · ${rekam.nama}`, oleh: pelakuKontrak(k.pelaku), rujukan: { jenis: 'penduduk', id: rekam.id },
  })
  return pendudukSchema.parse(bentukPenduduk(rekam, k.penyandi))
}

/**
 * Mengubah biodata penduduk. Hanya field yang berubah yang dicatat ke Riwayat; tanpa perubahan nyata tidak ada yang ditulis.
 * Kepala keluarga tidak berubah di sini (lewat Ganti kepala keluarga di halaman KK).
 */
export async function ubahPenduduk(k: KonteksTulis, id: string, mentah: unknown): Promise<Penduduk> {
  const rekam = await bacaPendudukSatu(k.db, id, cakupanDusun(k.pelaku))
  if (!rekam) throw new GalatApp('NOT_FOUND', PESAN_PENDUDUK_TIDAK_ADA, 404)
  const isian = ubahPendudukSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const ubah = isian.data
  if (ubah.tanggalLahir !== undefined && ubah.tanggalLahir > tanggalIsoWib(k.sekarang)) throw galatField('tanggalLahir', LEWAT_HARI_INI)

  const nikIndeks = ubah.nik ? k.penyandi.indeks(ubah.nik, ruang.nik(k.desa.id)) : null
  if (nikIndeks !== null) {
    const pemilik = await cariPemilikNik(k.db, nikIndeks, rekam.id)
    if (pemilik) throw galatField('nik', pesanNikGanda(pemilik.nama), 'CONFLICT')
  }

  const lama = bentukPenduduk(rekam, k.penyandi)
  const gantiKepala =
    ubah.hubunganKeluarga !== undefined &&
    ubah.hubunganKeluarga !== lama.hubunganKeluarga &&
    (ubah.hubunganKeluarga === 'Kepala Keluarga' || lama.hubunganKeluarga === 'Kepala Keluarga')
  if (gantiKepala) throw galatField('hubunganKeluarga', 'Kepala keluarga diubah lewat halaman KK (Ganti kepala keluarga)')

  const perubahan = daftarPerubahan(lama, ubah)
  if (perubahan.length === 0) return pendudukSchema.parse(lama)

  const { nik, telepon, ...biasa } = ubah
  const set: PerubahanPenduduk = { ...biasa, diubahPada: k.sekarang }
  if (nik !== undefined) {
    set.nikSandi = nik === null ? null : k.penyandi.sandikan(nik, ruang.nik(k.desa.id))
    set.nikIndeks = nikIndeks
  }
  if (telepon !== undefined) set.teleponSandi = telepon === null ? null : k.penyandi.sandikan(telepon, ruang.telepon(k.desa.id))

  let baru
  try {
    baru = await perbaruiPenduduk(k.db, rekam.id, set)
  } catch (e) {
    if (pelanggaranUnik(e, INDEKS_NIK)) throw galatField('nik', 'NIK sudah terdaftar', 'CONFLICT')
    throw e
  }
  const waktu = waktuIsoWib(k.sekarang)
  const oleh = pelakuKontrak(k.pelaku)
  await catatRiwayat(k.db, k.penyandi, { id: baru.id, desaId: baru.desaId }, perubahan, oleh, waktu)
  await catatAktivitas(k.db, {
    desaId: baru.desaId, dusunId: baru.dusunId, waktu, jenis: 'penduduk-ubah',
    ringkasan: `Data penduduk diubah · ${baru.nama} (${perubahan.map((u) => LABEL_FIELD[u.field]).join(', ')})`, oleh, rujukan: { jenis: 'penduduk', id: baru.id },
  })
  return pendudukSchema.parse(bentukPenduduk(baru, k.penyandi))
}
