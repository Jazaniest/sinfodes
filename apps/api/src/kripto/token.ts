import { createHash, randomBytes } from 'node:crypto'

/** Token sesi: 256 bit acak. Yang disimpan di basis data hanya hash-nya (SPEC-V0.3 §8.2). */
export function buatTokenSesi(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('base64url')

/** Token dari cookie diperiksa bentuknya dulu supaya masukan sembarang tidak sampai ke basis data. */
export const bentukTokenSah = (token: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(token)
