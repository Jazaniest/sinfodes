import { hash, verify } from '@node-rs/argon2'

/**
 * argon2id sesuai pedoman OWASP (m=19 MiB, t=2, p=1). Algoritma tidak disebut karena `Algorithm` di pustaka adalah
 * `const enum` ambien; bawaan pustaka memang Argon2id, dan uji memastikan hash berawalan `$argon2id$`.
 */
const PARAMETER = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const

export const hashKataSandi = (teks: string): Promise<string> => hash(teks, PARAMETER)

/** Hash rusak atau kosong dianggap salah, bukan galat. */
export async function periksaKataSandi(hashTersimpan: string, teks: string): Promise<boolean> {
  try {
    return await verify(hashTersimpan, teks)
  } catch {
    return false
  }
}

let hashPalsu: Promise<string> | null = null

/**
 * Memakan waktu sebanding dengan pemeriksaan sungguhan dan selalu salah. Dipakai saat akun tidak ada supaya jawaban
 * masuk tidak membedakan "akun tidak dikenal" dari "kata sandi salah" (SPEC-V0.3 §15.1).
 */
export async function periksaTerhadapPalsu(teks: string): Promise<false> {
  hashPalsu ??= hashKataSandi('kata-sandi-palsu-yang-tidak-pernah-dipakai')
  await periksaKataSandi(await hashPalsu, teks)
  return false
}
