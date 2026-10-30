import { sql as dsql } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'

/**
 * Pengunci percobaan masuk di PostgreSQL (SPEC-V0.3 §8.5), supaya bertahan saat server dimulai ulang. Lima kegagalan
 * berturut-turut mengunci kuncinya 15 menit, lalu berlipat (30, 60, ... menit) sampai 24 jam; berhasil masuk menghapusnya,
 * dan 24 jam tanpa kegagalan melupakannya. Kunci adalah teks indeks HMAC (NIK atau email), jadi akun yang tidak ada dihitung
 * persis seperti yang ada dan tidak ada yang membedakan keduanya.
 */
export type RuangKunci =
  | { tabel: 'desa'; desaId: string; jenis: 'warga' | 'panel' | 'passphrase' }
  | { tabel: 'platform'; jenis: 'konsol' | 'kabupaten' }

export const AMBANG_GAGAL = 5
const KUNCI_DASAR_MS = 15 * 60_000
const KUNCI_MAKS_MS = 24 * 3600_000
const LUPA_DETIK = 24 * 3600

const ms = (nilai: unknown): Date | null => (nilai === null || nilai === undefined ? null : new Date(Number(nilai)))
const lamaKunci = (kaliTerkunci: number): number => Math.min(KUNCI_DASAR_MS * 2 ** (kaliTerkunci - 1), KUNCI_MAKS_MS)

const tabel = (r: RuangKunci) => dsql.raw(r.tabel === 'desa' ? 'kunci_masuk_desa' : 'kunci_masuk_platform')
const kondisi = (r: RuangKunci, kunci: string) =>
  r.tabel === 'desa' ? dsql`desa_id = ${r.desaId} and jenis = ${r.jenis} and kunci = ${kunci}` : dsql`jenis = ${r.jenis} and kunci = ${kunci}`

type BarisKunci = { gagal: number; kali: number; sampai: string | null }

/** Waktu terkunci yang masih berlaku, atau null. */
export async function periksaKunci(db: Db, ruang: RuangKunci, kunci: string, sekarang: Date): Promise<{ terkunciSampai: Date | null }> {
  const [b] = await db.execute<{ sampai: string | null }>(
    dsql`select (extract(epoch from terkunci_sampai) * 1000)::bigint as sampai from ${tabel(ruang)} where ${kondisi(ruang, kunci)}`,
  )
  const sampai = ms(b?.sampai)
  return { terkunciSampai: sampai !== null && sampai.getTime() > sekarang.getTime() ? sampai : null }
}

/** Mencatat satu kegagalan. `sisa` adalah kesempatan yang tersisa sebelum terkunci (0 bila baru terkunci atau sedang terkunci). */
export async function catatGagal(db: Db, ruang: RuangKunci, kunci: string, sekarang: Date): Promise<{ terkunciSampai: Date | null; sisa: number }> {
  const t = sekarang.toISOString()
  const tb = tabel(ruang)
  // Basi: tidak ada kegagalan 24 jam terakhir dan tidak sedang terkunci; hitungan dan tingkat dimulai dari nol.
  const basi = dsql`(${tb}.diubah < ${t}::timestamptz - make_interval(secs => ${LUPA_DETIK}) and (${tb}.terkunci_sampai is null or ${tb}.terkunci_sampai <= ${t}::timestamptz))`
  const pembaruan = dsql`gagal = case when ${basi} then 1 else ${tb}.gagal + 1 end,
    kali_terkunci = case when ${basi} then 0 else ${tb}.kali_terkunci end, diubah = ${t}::timestamptz`
  const kembali = dsql`returning gagal, kali_terkunci as kali, (extract(epoch from terkunci_sampai) * 1000)::bigint as sampai`
  const [a] =
    ruang.tabel === 'desa'
      ? await db.execute<BarisKunci>(dsql`insert into kunci_masuk_desa (desa_id, jenis, kunci, gagal, kali_terkunci, diubah)
          values (${ruang.desaId}, ${ruang.jenis}, ${kunci}, 1, 0, ${t}::timestamptz)
          on conflict (desa_id, jenis, kunci) do update set ${pembaruan} ${kembali}`)
      : await db.execute<BarisKunci>(dsql`insert into kunci_masuk_platform (jenis, kunci, gagal, kali_terkunci, diubah)
          values (${ruang.jenis}, ${kunci}, 1, 0, ${t}::timestamptz)
          on conflict (jenis, kunci) do update set ${pembaruan} ${kembali}`)
  const gagal = Number(a.gagal)
  const masihTerkunci = ms(a.sampai)
  if (masihTerkunci !== null && masihTerkunci.getTime() > sekarang.getTime()) return { terkunciSampai: masihTerkunci, sisa: 0 }
  if (gagal < AMBANG_GAGAL) return { terkunciSampai: null, sisa: AMBANG_GAGAL - gagal }
  const kali = Number(a.kali) + 1
  const sampai = new Date(sekarang.getTime() + lamaKunci(kali))
  await db.execute(
    dsql`update ${tb} set kali_terkunci = ${kali}, gagal = 0, terkunci_sampai = ${sampai.toISOString()}::timestamptz where ${kondisi(ruang, kunci)}`,
  )
  return { terkunciSampai: sampai, sisa: 0 }
}

/** Berhasil masuk: hitungan dan tingkat kunci dihapus. */
export async function hapusKunci(db: Db, ruang: RuangKunci, kunci: string): Promise<void> {
  await db.execute(dsql`delete from ${tabel(ruang)} where ${kondisi(ruang, kunci)}`)
}
