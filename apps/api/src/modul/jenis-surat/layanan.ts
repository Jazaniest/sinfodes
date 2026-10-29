import {
  bolehDiarsipkan, bolehDihapus, jenisDenganPakaiSchema, jenisKosong, jenisSuratSchema, salinJenis, STATUS_DAFTAR_JENIS, statusJenis, tambahJenisSchema,
  type JenisDenganPakai, type JenisSurat, type StatusJenis,
} from '@sinfodes/kontrak/surat/jenis'
import { pemohonContoh } from '@sinfodes/kontrak/surat/pemohon-contoh'
import { samaDenganSiap } from '@sinfodes/kontrak/surat/tata-letak-siap'
import { detailJenisSuratSchema, periksaJenisSurat, ubahJenisSuratSchema, type DetailJenisSurat } from '@sinfodes/kontrak/surat/ubah-jenis'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { pelanggaranKunciAsing, pelanggaranUnik } from '../../basisdata/galat-pg'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import { KENDALA_JENIS } from '../permohonan/repositori-tulis'
import { namaPejabat } from '../pengaturan-surat/pejabat'
import { bacaPengaturanSurat } from '../pengaturan-surat/repositori'
import { pemakaianJenis } from './pemakaian'
import { bacaJenisDesa, bacaJenisSatu, hapusBarisJenis, INDEKS_KODE_JENIS, sisipJenis, tulisKolomJenis } from './repositori'

export const PESAN_TIDAK_DITEMUKAN = 'Jenis surat tidak ditemukan.'

export type KonteksJenis = { db: Db; desaId: string; sekarang: Date }
export type HasilDaftarJenis = { data: JenisDenganPakai[]; meta: { page: number; pageSize: number; total: number } }

const statusSchema = z.enum(STATUS_DAFTAR_JENIS).nullable()

/** Nilai `?status=` yang sah, atau null bila tidak dikirim; selain itu 422 pada field `status`. */
export function bacaStatusJenis(mentah: string | undefined): StatusJenis | null {
  const hasil = statusSchema.safeParse(mentah ?? null)
  if (!hasil.success) throw galatField('status', 'Status jenis surat tidak dikenal.')
  return hasil.data
}

/** Katalog jenis surat desa beserta pemakaiannya, satu halaman (SPEC §3.4), opsional disaring menurut status. */
export async function daftarJenis(k: Pick<KonteksJenis, 'db' | 'desaId' | 'sekarang'>, status: StatusJenis | null): Promise<HasilDaftarJenis> {
  const pakai = await pemakaianJenis(k.db, k.desaId, k.sekarang)
  const data = (await bacaJenisDesa(k.db))
    .filter((j) => status === null || statusJenis(j) === status)
    .map((j) => ({ ...j, jumlahPakai: pakai.jumlah.get(j.id) ?? 0, dipakai: pakai.dipakai.has(j.id) }))
  return { data: jenisDenganPakaiSchema.array().parse(data), meta: { page: 1, pageSize: Math.max(data.length, 1), total: data.length } }
}

/**
 * Satu jenis beserta bahan pratinjau halaman ubah. Perbedaan sengaja dari API tiruan (rencana 8F1 Ruling 4): contoh selalu
 * pemohon contoh tanpa NIK. Tiruan memilih kepala keluarga sungguhan, yang di server bisa berasal dari dusun lain daripada
 * Kepala Dusun yang membukanya. 8F2 memakai permohonan terakhir jenis ini bila ada dalam cakupan pemanggil.
 */
export async function detailJenis(k: KonteksJenis, id: string): Promise<DetailJenisSurat> {
  const jenis = await bacaJenisSatu(k.db, id)
  if (!jenis) throw new GalatApp('NOT_FOUND', PESAN_TIDAK_DITEMUKAN, 404)
  const pakai = await pemakaianJenis(k.db, k.desaId, k.sekarang)
  return detailJenisSuratSchema.parse({
    jenis: { ...jenis, jumlahPakai: pakai.jumlah.get(jenis.id) ?? 0, dipakai: pakai.dipakai.has(jenis.id) },
    contoh: { pemohon: pemohonContoh(k.desaId, k.sekarang), tiruan: true, subjek: null, mutasi: null, isian: {} },
    pengaturan: await bacaPengaturanSurat(k.db, k.desaId),
    pejabat: await namaPejabat(k.db, k.desaId),
  })
}

const PESAN_BAWAAN = 'Jenis bawaan tidak bisa dihapus atau diarsipkan.'
const PESAN_KODE_DIPAKAI = 'Kode sudah dipakai jenis surat lain.'
const PESAN_JENIS_TERPAKAI = 'Jenis ini sudah pernah dipakai. Arsipkan saja.'
const tidakAda = () => new GalatApp('NOT_FOUND', PESAN_TIDAK_DITEMUKAN, 404)

/** Jenis milik desa pada konteks, dikunci barisnya (FOR UPDATE), atau 404. Dipakai semua perubahan satu jenis. */
async function ambilTerkunci(db: Db, id: string): Promise<JenisSurat> {
  const jenis = await bacaJenisSatu(db, id, { kunci: true })
  if (!jenis) throw tidakAda()
  return jenis
}

/**
 * Menambah jenis kosong atau salinan jenis desa ini (SPEC-V0.2 12.1). Selalu mati dan buatan desa. Kode unik per desa, termasuk
 * terhadap jenis arsip: pemeriksaan awal memberi pesan, indeks unik `(desa_id, kode)` menjaga permintaan serentak (23505 menjadi
 * 422 pada field kode, bukan 500).
 */
export async function tambahJenis(k: Pick<KonteksJenis, 'db' | 'desaId'>, mentah: unknown): Promise<JenisSurat> {
  const masukan = tambahJenisSchema.safeParse(mentah)
  if (!masukan.success) throw galatIsian(masukan.error)
  const m = masukan.data
  const sumber = m.dari === null ? null : await bacaJenisSatu(k.db, m.dari)
  if (m.dari !== null && !sumber) throw tidakAda()
  if ((await bacaJenisDesa(k.db)).some((j) => j.kode === m.kode)) throw galatField('kode', PESAN_KODE_DIPAKAI)
  const isi = sumber ? salinJenis(sumber, m.kode, m.nama.trim()) : jenisKosong({ id: k.desaId }, m.kode, m.nama.trim())
  const baru = jenisSuratSchema.parse({ ...isi, id: `js_${randomUUID()}` })
  try {
    await sisipJenis(k.db, baru)
  } catch (e) {
    if (pelanggaranUnik(e, INDEKS_KODE_JENIS)) throw galatField('kode', PESAN_KODE_DIPAKAI)
    throw e
  }
  return baru
}

/**
 * Menyunting jenis. Barisnya dikunci lebih dulu lalu dibaca ulang, jadi penyuntingan serentak dan arsip serentak saling
 * melihat keadaan terbaru (tiruan tidak perlu kunci karena JavaScript berutas tunggal). `siap` pada tata letak per jenis
 * selalu dihitung ulang dari isinya (SPEC-V0.3 §7.8). `kode`, `subjek`, dan `asal` tidak termasuk badan dan tak bisa berubah.
 */
export async function ubahJenis(k: KonteksJenis, id: string, mentah: unknown): Promise<DetailJenisSurat> {
  const masukan = ubahJenisSuratSchema.safeParse(mentah)
  if (!masukan.success) throw galatIsian(masukan.error)
  const lama = await ambilTerkunci(k.db, id)
  if (lama.diarsipkan !== null) throw new GalatApp('CONFLICT', 'Jenis ini diarsipkan. Aktifkan lagi sebelum mengubahnya.', 409)
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
  if (Object.keys(galat).length > 0) throw new GalatApp('VALIDATION', 'Jenis surat belum bisa disimpan.', 422, galat)
  await tulisKolomJenis(k.db, jenisSuratSchema.parse(baru), null)
  return detailJenis(k, id)
}

/** Menghapus jenis buatan desa yang belum dipakai permohonan mana pun; selebihnya diarsipkan (SPEC-V0.2 12.1). */
export async function hapusJenis(k: Pick<KonteksJenis, 'db' | 'desaId' | 'sekarang'>, id: string): Promise<{ id: string }> {
  const jenis = await ambilTerkunci(k.db, id)
  if (jenis.asal === 'bawaan') throw new GalatApp('VALIDATION', PESAN_BAWAAN, 422)
  const pakai = await pemakaianJenis(k.db, k.desaId, k.sekarang)
  if (!bolehDihapus(jenis, pakai.dipakai.has(jenis.id))) throw new GalatApp('CONFLICT', PESAN_JENIS_TERPAKAI, 409)
  try {
    if ((await hapusBarisJenis(k.db, jenis.id)) !== 1) throw tidakAda()
  } catch (e) {
    // Lapis kedua: pemeriksaan di atas sudah menolak jenis terpakai, dan kunci asing RESTRICT menjaga yang lolos (rencana 8F2a Ruling 8).
    if (pelanggaranKunciAsing(e, KENDALA_JENIS)) throw new GalatApp('CONFLICT', PESAN_JENIS_TERPAKAI, 409)
    throw e
  }
  return { id: jenis.id }
}

/** Mengarsipkan jenis buatan desa: mati dan tak bisa diubah. Permohonan yang sedang berjalan tidak disentuh (fokus review 1 tiruan). */
export async function arsipkanJenis(k: KonteksJenis, id: string): Promise<JenisSurat> {
  const jenis = await ambilTerkunci(k.db, id)
  if (jenis.asal === 'bawaan') throw new GalatApp('VALIDATION', PESAN_BAWAAN, 422)
  if (!bolehDiarsipkan(jenis)) throw new GalatApp('CONFLICT', 'Jenis ini sudah diarsipkan.', 409)
  await tulisKolomJenis(k.db, { ...jenis, aktif: false }, k.sekarang)
  return (await bacaJenisSatu(k.db, id)) ?? jenis
}

/** Mengaktifkan lagi jenis arsip: dibuka dari arsip tetapi tetap mati; desa menyalakan layanannya sendiri (keputusan 4 tiruan). */
export async function aktifkanLagiJenis(k: Pick<KonteksJenis, 'db'>, id: string): Promise<JenisSurat> {
  const jenis = await ambilTerkunci(k.db, id)
  if (jenis.diarsipkan === null) throw new GalatApp('CONFLICT', 'Jenis ini tidak sedang diarsipkan.', 409)
  await tulisKolomJenis(k.db, { ...jenis, aktif: false }, null)
  return (await bacaJenisSatu(k.db, id)) ?? jenis
}
