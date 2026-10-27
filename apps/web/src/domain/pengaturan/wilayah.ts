import { z } from 'zod'
import { galatDariZod } from '../format/galat-isian'
import { dusunSchema, istilahWilayahSchema, type Dusun } from '../wilayah/schema'

const nama = (label: string) => z.string().trim().min(1, `${label} wajib diisi`).max(60, 'Paling banyak 60 karakter')
const istilah = z.string().trim().min(1, 'Istilah wajib diisi').max(20, 'Paling banyak 20 karakter')
const nomor3 = z.string().regex(/^\d{3}$/)

/**
 * PUT /pengaturan/wilayah: istilah wilayah dan pohon dusun → RW → RT (SPEC §8). Selama desa belum punya penduduk,
 * susunannya boleh berubah (tahap 6C); sesudahnya hanya nama yang boleh berubah, karena setiap penduduk dan KK terikat ke
 * nomor RW dan RT-nya.
 */
export const ubahWilayahSchema = z.object({
  istilah: z.object({ dusun: istilah, rw: istilah, rt: istilah }),
  dusun: z
    .array(
      z.object({
        id: z.string(),
        nama: nama('Nama dusun'),
        kepalaDusun: nama('Nama kepala dusun'),
        rw: z
          .array(
            z.object({
              nomor: nomor3,
              ketua: nama('Nama ketua RW'),
              rt: z.array(z.object({ nomor: nomor3, ketua: nama('Nama ketua RT') })).min(1, 'Setiap RW punya minimal satu RT'),
            }),
          )
          .min(1, 'Setiap dusun punya minimal satu RW'),
      }),
    )
    .min(1, 'Tambahkan minimal satu dusun'),
})
export type UbahWilayah = z.infer<typeof ubahWilayahSchema>
export type DusunForm = UbahWilayah['dusun'][number]
export type RwForm = DusunForm['rw'][number]

/**
 * GET /pengaturan/wilayah: istilah dan dusun desa, urut nomor dusun. `susunanTerkunci` sejak desa punya penduduk atau KK;
 * sebelum itu dusun, RW, dan RT masih bisa ditambah dan dihapus.
 */
export const wilayahDesaSchema = z.object({ istilah: istilahWilayahSchema, dusun: z.array(dusunSchema), susunanTerkunci: z.boolean() })
export type WilayahDesa = z.infer<typeof wilayahDesaSchema>

/** Formulir dari data tersimpan (salinan, supaya data asli tidak ikut berubah saat disunting). */
export function formDariWilayah(w: Pick<WilayahDesa, 'istilah' | 'dusun'>): UbahWilayah {
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

/** Awalan ID dusun yang belum tersimpan; server memberi dusun itu ID baru. */
export const AWALAN_DUSUN_BARU = 'baru-'

/** RW baru berisi satu RT. Nomornya diisi `nomoriSusunan`. */
export const rwKosong = (): RwForm => ({ nomor: '000', ketua: '', rt: [{ nomor: '000', ketua: '' }] })

/** Dusun baru berisi satu RW dan satu RT. `kunci` membuat ID sementaranya unik di formulir. */
export const dusunKosong = (kunci: number): DusunForm => ({ id: `${AWALAN_DUSUN_BARU}${kunci}`, nama: '', kepalaDusun: '', rw: [rwKosong()] })

const tigaAngka = (n: number) => String(n).padStart(3, '0')

/**
 * Nomor RW dan RT menurut urutannya, berurutan se-desa (001, 002, …), sama dengan penomoran data Sungai Sialang. Nomor
 * dusun adalah urutannya di daftar. Dipakai selama susunan wilayah masih terbuka; masukannya tidak diubah.
 */
export function nomoriSusunan(dusun: readonly DusunForm[]): DusunForm[] {
  let rw = 0
  let rt = 0
  return dusun.map((d) => ({
    ...d,
    rw: d.rw.map((w) => {
      rw += 1
      return {
        ...w,
        nomor: tigaAngka(rw),
        rt: w.rt.map((t) => {
          rt += 1
          return { ...t, nomor: tigaAngka(rt) }
        }),
      }
    }),
  }))
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
