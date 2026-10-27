import { z } from 'zod'

export const barisLembarSchema = z.object({ label: z.string(), nilai: z.string(), tebal: z.boolean() })
export type BarisLembar = z.infer<typeof barisLembarSchema>

export const blokLembarSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('paragraf'), teks: z.string() }),
  z.object({ jenis: z.literal('tabel'), baris: z.array(barisLembarSchema) }),
])
export type BlokLembar = z.infer<typeof blokLembarSchema>

/** Isi lembar surat di bawah kop: judul, pembuka, tabel dan paragraf, lalu tempat dan tanggal (SPEC §7.5). */
export const isiLembarSchema = z.object({
  judul: z.string().min(1),
  pembuka: z.string().min(1),
  blok: z.array(blokLembarSchema),
  tempatTanggal: z.string().min(1),
})
export type IsiLembar = z.infer<typeof isiLembarSchema>
