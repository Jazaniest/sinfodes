import type { z } from 'zod'

/** Galat Zod → pesan per isian, mis. { "jamLayanan.0.tutup": "Jam tutup harus sesudah jam buka" }. Satu pesan per isian. */
export function galatDariZod(galat: z.ZodError): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const isu of galat.issues) {
    const kunci = isu.path.map(String).join('.') || '_'
    hasil[kunci] ??= isu.message
  }
  return hasil
}
