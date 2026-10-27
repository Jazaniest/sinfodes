import { randomBytes } from 'node:crypto'
import type postgres from 'postgres'
import { hashKataSandi } from '../src/kripto/kata-sandi'
import type { Penyandi } from '../src/kripto/penyandi'
import { ruang } from '../src/kripto/ruang'

export type AkunKonsolUji = {
  id: string
  email: string
  kataSandi: string
  /** Rahasia TOTP mentah (20 bita) bila akun memakai TOTP, atau null. */
  rahasia: Buffer | null
}

/**
 * Menyisipkan akun Konsol uji lewat peran migrasi. Dengan `totp`, rahasia 20 bita dibuat acak, disandikan seperti di server
 * (ruang `pengguna_konsol.totp`), dan dikembalikan ke uji supaya bisa menghitung kode.
 */
export async function buatAkunKonsolUji(sql: postgres.Sql, penyandi: Penyandi, opsi: { totp: boolean; aktif?: boolean }): Promise<AkunKonsolUji> {
  const id = `kns_uji_${randomBytes(5).toString('hex')}`
  const email = `${id}@sinfodes.id`
  const kataSandi = `Sandi-${randomBytes(9).toString('base64url')}`
  const rahasia = opsi.totp ? randomBytes(20) : null
  await sql`insert into pengguna_konsol (id, nama, jabatan, peran, email, aktif, kata_sandi_hash, totp_rahasia_sandi, dibuat)
    values (${id}, 'Akun Uji', 'Tim Sinfodes', 'tim', ${email}, ${opsi.aktif ?? true}, ${await hashKataSandi(kataSandi)},
      ${rahasia ? penyandi.sandikan(rahasia.toString('base64'), ruang.totpKonsol) : null}, now())`
  return { id, email, kataSandi, rahasia }
}
