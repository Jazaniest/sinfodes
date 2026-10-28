/**
 * Apakah galat ini tabrakan indeks unik bernama `indeks` (kode PostgreSQL 23505)? Drizzle membungkus galat basis data di
 * `cause`, jadi rantainya ditelusuri. Dipakai untuk mengubah permintaan serentak yang kalah menjadi 409, bukan 500.
 */
export function pelanggaranUnik(galat: unknown, indeks: string): boolean {
  for (let x = galat as { code?: string; constraint_name?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) {
    if (x.code === '23505' && x.constraint_name === indeks) return true
  }
  return false
}
