import {
  aturPassphraseSchema, PESAN_PASSPHRASE_BELUM_ADA, PESAN_PASSPHRASE_SALAH, type StatusPassphrase,
} from '@sinfodes/kontrak/surat/passphrase'
import { catatAudit } from '../../audit'
import type { Db } from '../../basisdata/klien'
import { GalatApp, GalatDisimpan } from '../../galat'
import { galatIsian } from '../../galat-isian'
import { hashKataSandi, periksaKataSandi } from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { PESAN_SESI_BERAKHIR } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING } from '../../lapisan/batas-laju'
import type { PelakuPanel } from '../../lapisan/konteks'
import { catatGagal, hapusKunci, periksaKunci, type RuangKunci } from '../../sesi/kunci-masuk'
import { cariPenggunaMenurutId } from '../../sesi/repositori'
import { bacaHashPassphrase, kunciPercobaanPassphrase, simpanHashPassphrase } from './repositori'

/** Yang dibutuhkan pemeriksaan passphrase: `permohonanId` hanya untuk jejak audit bila percobaan berasal dari penandatanganan. */
export type KonteksPassphrase = {
  db: Db
  penyandi: Penyandi
  pelaku: Pick<PelakuPanel, 'id' | 'desaId'>
  sekarang: Date
  permohonanId?: string
}

const PESAN_KATA_SANDI_SALAH = 'Kata sandi salah.'

export async function statusPassphrase(db: Db, penggunaId: string): Promise<StatusPassphrase['diatur']> {
  return (await bacaHashPassphrase(db, penggunaId)) !== null
}

const ruangKunci = (k: KonteksPassphrase): RuangKunci => ({ tabel: 'desa', desaId: k.pelaku.desaId, jenis: 'passphrase' })
/** Kunci pencacah = indeks HMAC id pengguna: id polos tidak ada di tabel pengunci. */
const kunciHitung = (k: KonteksPassphrase): string => k.penyandi.indeks(k.pelaku.id, ruang.passphrasePengguna(k.pelaku.desaId))

/** Mengambil kunci pengguna lalu menolak bila sedang terkunci, tanpa menjalankan argon2. */
async function mulaiPercobaan(k: KonteksPassphrase): Promise<void> {
  await kunciPercobaanPassphrase(k.db, k.pelaku.desaId, k.pelaku.id)
  if ((await periksaKunci(k.db, ruangKunci(k), kunciHitung(k), k.sekarang)).terkunciSampai) {
    throw new GalatDisimpan('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
  }
}

/** Satu percobaan salah: hitungan dan jejak audit tersimpan walau jawabannya 4xx (GalatDisimpan, sebelum tulis domain apa pun). */
async function catatPercobaanSalah(k: KonteksPassphrase, alasan: 'kata-sandi-salah' | 'passphrase-salah', field: 'kataSandi' | 'passphrase', pesan: string): Promise<never> {
  const gagal = await catatGagal(k.db, ruangKunci(k), kunciHitung(k), k.sekarang)
  await catatAudit(k.db, {
    desaId: k.pelaku.desaId,
    jenis: 'passphrase.gagal',
    pelaku: k.pelaku.id,
    waktu: k.sekarang,
    // Tanpa isi tebakan: hanya sebabnya dan permohonan yang sedang ditandatangani.
    ringkasan: k.permohonanId === undefined ? { alasan } : { alasan, permohonanId: k.permohonanId },
  })
  if (gagal.terkunciSampai) throw new GalatDisimpan('RATE_LIMITED', PESAN_TERLALU_SERING, 429)
  throw new GalatDisimpan('VALIDATION', pesan, 422, { [field]: pesan })
}

/**
 * Menetapkan atau mengganti passphrase (Ruling 1). Kata sandi akun diperiksa ulang dan dihitung bersama percobaan passphrase
 * (Ruling 3): salah menaikkan hitungan, benar menghapusnya.
 */
export async function aturPassphrase(k: KonteksPassphrase, mentah: unknown): Promise<StatusPassphrase> {
  const isian = aturPassphraseSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  await mulaiPercobaan(k)
  const pengguna = await cariPenggunaMenurutId(k.db, k.pelaku.id)
  if (!pengguna) throw new GalatApp('UNAUTHENTICATED', PESAN_SESI_BERAKHIR, 401)
  if (!(await periksaKataSandi(pengguna.kataSandiHash, isian.data.kataSandi))) {
    return catatPercobaanSalah(k, 'kata-sandi-salah', 'kataSandi', PESAN_KATA_SANDI_SALAH)
  }
  await hapusKunci(k.db, ruangKunci(k), kunciHitung(k))
  await simpanHashPassphrase(k.db, { penggunaId: pengguna.id, desaId: k.pelaku.desaId, hash: await hashKataSandi(isian.data.passphrase), sekarang: k.sekarang })
  await catatAudit(k.db, { desaId: k.pelaku.desaId, jenis: 'passphrase.diatur', pelaku: pengguna.id, waktu: k.sekarang, ringkasan: {} })
  return { diatur: true }
}

/**
 * Memeriksa passphrase penanda tangan sebelum menandatangani (Ruling 3-5). Urutan: kunci pengguna, pengunci (terkunci = 429
 * tanpa argon2), passphrase belum ada (422, tidak dihitung), verifikasi. Salah melempar GalatDisimpan: dilempar HANYA sebelum
 * tulis domain apa pun, supaya hitungan dan jejak tersimpan sementara permohonan tak berubah.
 */
export async function periksaPassphrase(k: KonteksPassphrase, passphrase: string): Promise<void> {
  await mulaiPercobaan(k)
  const hash = await bacaHashPassphrase(k.db, k.pelaku.id)
  if (hash === null) throw new GalatApp('VALIDATION', PESAN_PASSPHRASE_BELUM_ADA, 422, { passphrase: PESAN_PASSPHRASE_BELUM_ADA })
  if (await periksaKataSandi(hash, passphrase)) {
    await hapusKunci(k.db, ruangKunci(k), kunciHitung(k))
    return
  }
  await catatPercobaanSalah(k, 'passphrase-salah', 'passphrase', PESAN_PASSPHRASE_SALAH)
}
