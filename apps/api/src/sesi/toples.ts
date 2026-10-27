import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Konfigurasi } from '../konfigurasi'
import { namaKuki, type KeluargaPelaku } from './pelaku'

/**
 * Cookie sesi (SPEC-V0.3 §8.1): `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, tanpa `Domain`, sehingga hanya kembali ke
 * host yang menerbitkannya. Awalan `__Host-` memaksa peramban menolak cookie yang menyimpang dari atribut itu;
 * `COOKIE_AWALAN=__Secure-` hanya cadangan pengembangan bila peramban menolak `__Host-` pada `*.localhost`.
 */
type Awalan = Konfigurasi['cookieAwalan']

const ATRIBUT = { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' } as const

export const pasangKuki = (c: Context, keluarga: KeluargaPelaku, awalan: Awalan, token: string): void =>
  setCookie(c, namaKuki(keluarga, awalan), token, ATRIBUT)

export const bacaKuki = (c: Context, keluarga: KeluargaPelaku, awalan: Awalan): string | undefined => getCookie(c, namaKuki(keluarga, awalan))

export const hapusKuki = (c: Context, keluarga: KeluargaPelaku, awalan: Awalan): void => {
  deleteCookie(c, namaKuki(keluarga, awalan), ATRIBUT)
}
