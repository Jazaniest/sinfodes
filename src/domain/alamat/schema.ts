import { z } from 'zod'
import { kategoriKabupatenSchema } from '../indeks/schema'
import { STATUS_DESA } from '../wilayah/schema'

/** Desa pemilik alamat: cukup untuk kepala halaman masuk, berlaku untuk status apa pun (SPEC-V0.2 §4.3). */
export const desaAlamatSchema = z.object({
  label: z.string(),
  nama: z.string(),
  kecamatan: z.string(),
  kabupaten: z.string(),
  status: z.enum(STATUS_DESA),
  lambang: z.string().nullable(),
})
export type DesaAlamat = z.infer<typeof desaAlamatSchema>

/** GET /alamat: apa yang ada di alamat ini. `alias` berarti alamat lama yang harus dialihkan (SPEC-V0.2 §4.2). */
export const hasilAlamatSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('desa'), desa: desaAlamatSchema }),
  z.object({ jenis: z.literal('alias'), labelBaru: z.string() }),
  z.object({ jenis: z.literal('induk') }),
  z.object({ jenis: z.literal('konsol') }),
  /** Alamat `kab-…` yang ada di tabel kode wilayah; `mitra` false menampilkan "belum memakai Sinfodes" (SPEC-V0.2 §8.2). */
  z.object({
    jenis: z.literal('kabupaten'),
    kabupaten: z.object({ label: z.string(), kode: z.string(), nama: z.string(), mitra: z.boolean() }),
  }),
])
export type HasilAlamat = z.infer<typeof hasilAlamatSchema>

/** GET /induk/cari-desa: desa yang websitenya tayang, cukup untuk menuju alamatnya (SPEC-V0.2 §4.4). */
export const hasilCariDesaSchema = z.object({
  hasil: z.array(z.object({ label: z.string(), nama: z.string(), kecamatan: z.string(), kabupaten: z.string() })),
})
export type HasilCariDesa = z.infer<typeof hasilCariDesaSchema>

const peringkatJuara = { peringkat: z.number().int().min(1), bersama: z.boolean() }

/**
 * "Juara bulan ini" di halaman utama (rencana 7C-2 butir 12): podium bulan terakhir tutup saja. Strict, tanpa Indeks atau
 * tingkatan. `label` kabupaten hanya ada untuk kabupaten mitra, karena hanya mitra yang punya portal. Null bila tidak ada podium.
 */
export const juaraIndukSchema = z
  .strictObject({
    periode: z.strictObject({ kode: z.string(), label: z.string() }),
    provinsi: z.array(
      z.strictObject({
        provinsi: z.strictObject({ kode: z.string(), nama: z.string() }),
        kategori: z.array(
          z.strictObject({
            kategori: kategoriKabupatenSchema,
            podium: z.array(z.strictObject({ ...peringkatJuara, kabupaten: z.strictObject({ nama: z.string(), label: z.string().nullable() }) })),
          }),
        ),
      }),
    ),
    kabupatenMitra: z.array(
      z.strictObject({
        kabupaten: z.strictObject({ nama: z.string(), label: z.string() }),
        juaraUmum: z.array(z.strictObject({ ...peringkatJuara, desa: z.strictObject({ nama: z.string(), alamat: z.string() }) })),
      }),
    ),
  })
  .nullable()
export type JuaraInduk = z.infer<typeof juaraIndukSchema>

/** GET /induk/ringkasan: angka untuk halaman utama Sinfodes. `desaBergabung` = desa Aktif dan Uji coba. */
/** GET /induk/ringkasan (SPEC-V0.2 §4.4): bukti di halaman utama; kabupaten mitra urut nama, bertautan ke portalnya (§8.2). */
export const ringkasanIndukSchema = z.object({
  desaBergabung: z.number().int().min(0),
  kabupatenMitra: z.array(z.object({ label: z.string(), nama: z.string() })),
  juara: juaraIndukSchema,
})
export type RingkasanInduk = z.infer<typeof ringkasanIndukSchema>
