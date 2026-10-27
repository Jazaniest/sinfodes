import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Konfigurasi } from '../konfigurasi'

/**
 * Cookie sesi panel (SPEC-V0.3 §8.1): `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, tanpa `Domain`, sehingga hanya
 * kembali ke host yang menerbitkannya. Awalan `__Host-` memaksa peramban menolak cookie yang menyimpang dari atribut itu;
 * `COOKIE_AWALAN=__Secure-` hanya cadangan pengembangan bila peramban menolak `__Host-` pada `*.localhost`.
 */
type Awalan = Konfigurasi['cookieAwalan']

export const namaKukiPanel = (awalan: Awalan): string => `${awalan}panel`

const ATRIBUT = { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' } as const

export const pasangKukiPanel = (c: Context, awalan: Awalan, token: string): void => setCookie(c, namaKukiPanel(awalan), token, ATRIBUT)

export const bacaKukiPanel = (c: Context, awalan: Awalan): string | undefined => getCookie(c, namaKukiPanel(awalan))

export const hapusKukiPanel = (c: Context, awalan: Awalan): void => {
  deleteCookie(c, namaKukiPanel(awalan), ATRIBUT)
}
