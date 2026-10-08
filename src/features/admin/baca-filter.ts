import type { z } from 'zod'

/** Filter dari URL: parameter rusak atau asing diabaikan satu per satu, bukan menggagalkan halaman. */
export function bacaFilterUrl<S extends z.ZodObject>(skema: S, cari: Record<string, unknown>): z.infer<S> {
  const sah: Record<string, unknown> = {}
  for (const [kunci, nilai] of Object.entries(cari)) {
    if (kunci in skema.shape && skema.safeParse({ [kunci]: nilai }).success) sah[kunci] = nilai
  }
  return skema.parse(sah)
}
