import { z } from 'zod'
import { galatDariZod } from '../format/galat-isian'
import { dusunSchema, istilahWilayahSchema, type Dusun } from '../wilayah/schema'

const nama = (label: string) => z.string().trim().min(1, `${label} wajib diisi`).max(60, 'Paling banyak 60 karakter')
const istilah = z.string().trim().min(1, 'Istilah wajib diisi').max(20, 'Paling banyak 20 karakter')
const nomor3 = z.string().regex(/^\d{3}$/)

/**
 * PUT /pengaturan/wilayah: istilah wilayah dan nama-nama di pohon dusun → RW → RT (SPEC §8). Susunannya tidak berubah:
 * setiap penduduk dan KK terikat ke nomor RW dan RT-nya.
 */
export const ubahWilayahSchema = z.object({
  istilah: z.object({ dusun: istilah, rw: istilah, rt: istilah }),
  dusun: z
    .array(
      z.object({
        id: z.string(),
        nama: nama('Nama dusun'),
        kepalaDusun: nama('Nama kepala dusun'),
        rw: z.array(
          z.object({ nomor: nomor3, ketua: nama('Nama ketua RW'), rt: z.array(z.object({ nomor: nomor3, ketua: nama('Nama ketua RT') })) }),
        ),
      }),
    )
    .min(1),
})
export type UbahWilayah = z.infer<typeof ubahWilayahSchema>

/** GET /pengaturan/wilayah: istilah dan dusun desa, urut nomor dusun. */
export const wilayahDesaSchema = z.object({ istilah: istilahWilayahSchema, dusun: z.array(dusunSchema) })
export type WilayahDesa = z.infer<typeof wilayahDesaSchema>

/** Formulir dari data tersimpan (salinan, supaya data asli tidak ikut berubah saat disunting). */
export function formDariWilayah(w: WilayahDesa): UbahWilayah {
  return {
    istilah: { ...w.istilah },
    dusun: w.dusun.map((d) => ({
      id: d.id,
      nama: d.nama,
      kepalaDusun: d.kepalaDusun,
      rw: d.rw.map((rw) => ({ nomor: rw.nomor, ketua: rw.ketua, rt: rw.rt.map((rt) => ({ nomor: rt.nomor, ketua: rt.ketua })) })),
    })),
  }
}

type Susunan = { id: string; rw: readonly { nomor: string; rt: readonly { nomor: string }[] }[] }
const kunciSusunan = (d: Susunan) => `${d.id}:${d.rw.map((rw) => `${rw.nomor}(${rw.rt.map((rt) => rt.nomor).join(',')})`).join(';')}`

/** Dusun, RW, dan RT harus sama persis dengan yang tersimpan (urutan nomor dusun); hanya nama yang boleh berubah. */
export function susunanSama(u: UbahWilayah, dusun: readonly Dusun[]): boolean {
  return u.dusun.length === dusun.length && u.dusun.every((d, i) => kunciSusunan(d) === kunciSusunan(dusun[i]))
}

/** Galat per isian sebelum dikirim, mis. "dusun.0.rw.1.rt.0.ketua". */
export function periksaWilayah(u: UbahWilayah): Record<string, string> {
  const hasil = ubahWilayahSchema.safeParse(u)
  return hasil.success ? {} : galatDariZod(hasil.error)
}
