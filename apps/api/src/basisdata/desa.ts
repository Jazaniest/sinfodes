import { tampilanWargaSchema } from '@sinfodes/kontrak/alamat/schema'
import type { TampilanWarga } from '@sinfodes/kontrak/alamat/schema'
import { modulDesaSchema, type ModulDesa } from '@sinfodes/kontrak/pengaturan/modul'
import { desaSchema, dusunSchema, type Desa, type Dusun } from '@sinfodes/kontrak/wilayah/schema'
import { asc, eq } from 'drizzle-orm'
import type { Db } from './klien'
import { aliasAlamat, desa, dusun } from './skema'

/** Satu desa seperti yang dibutuhkan lapisan alamat dan sesi: identitas, modul, dan tampilan halaman masuk. */
export type DesaRekam = { desa: Desa; modul: ModulDesa; warnaAksen: string; tampilanWarga: TampilanWarga | null }

/**
 * Baris `desa` menjadi `Desa` kontrak. Diperiksa skema di batas ini: data rusak di basis data menjadi galat server yang
 * jelas, bukan jawaban yang menyimpang diam-diam. `lambang` kosong dihilangkan (bukan `null`) seperti pada API tiruan.
 */
export function dariBarisDesa(b: typeof desa.$inferSelect): DesaRekam {
  const entitas = desaSchema.parse({
    id: b.id,
    slug: b.slug,
    nama: b.nama,
    kodeDesa: b.kodeDesa,
    kecamatan: { kode: b.kecamatanKode, nama: b.kecamatanNama },
    kabupaten: { kode: b.kabupatenKode, nama: b.kabupatenNama },
    provinsi: { kode: b.provinsiKode, nama: b.provinsiNama },
    kodePos: b.kodePos,
    alamatKantor: b.alamatKantor,
    surel: b.surel,
    telepon: b.telepon,
    jamLayanan: b.jamLayanan,
    luasKm2: b.luasKm2,
    batas: b.batas,
    istilahWilayah: b.istilahWilayah,
    kodeSurat: b.kodeSurat,
    ...(b.lambang === null ? {} : { lambang: b.lambang }),
    ...(b.lambangKabupaten === null ? {} : { lambangKabupaten: b.lambangKabupaten }),
    status: b.status,
  })
  return {
    desa: entitas,
    modul: modulDesaSchema.parse(b.modul),
    warnaAksen: b.warnaAksen,
    tampilanWarga: tampilanWargaSchema.nullable().parse(b.tampilanWarga),
  }
}

export async function cariDesaMenurutSlug(db: Db, slug: string): Promise<DesaRekam | null> {
  const [b] = await db.select().from(desa).where(eq(desa.slug, slug)).limit(1)
  return b ? dariBarisDesa(b) : null
}

/** Alamat lama (alias) menjadi slug desa tujuannya, atau null. */
export async function cariSlugDariAlias(db: Db, label: string): Promise<string | null> {
  const [b] = await db
    .select({ slug: desa.slug })
    .from(aliasAlamat)
    .innerJoin(desa, eq(desa.id, aliasAlamat.desaId))
    .where(eq(aliasAlamat.label, label))
    .limit(1)
  return b?.slug ?? null
}

/** Dusun desa (dibatasi RLS ke desa pada konteks), urut nomor. */
export async function daftarDusunDesa(db: Db): Promise<Dusun[]> {
  const baris = await db.select().from(dusun).orderBy(asc(dusun.nomor))
  return baris.map((b) => dusunSchema.parse({ id: b.id, desaId: b.desaId, nomor: b.nomor, nama: b.nama, kepalaDusun: b.kepalaDusun, posyandu: b.posyandu, rw: b.rw }))
}
