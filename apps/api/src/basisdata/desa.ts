import { tampilanWargaSchema } from '@sinfodes/kontrak/alamat/schema'
import type { TampilanWarga } from '@sinfodes/kontrak/alamat/schema'
import { modulDesaSchema, type ModulDesa } from '@sinfodes/kontrak/pengaturan/modul'
import { desaSchema, dusunSchema, istilahWilayahSchema, type Desa, type Dusun } from '@sinfodes/kontrak/wilayah/schema'
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

/**
 * Desa menurut basis data saat ini, bukan `DesaRekam` permintaan (cache alamat 30 detik): kode surat, lambang, dan istilah
 * wilayah yang dibekukan ke surat terbit harus yang berlaku pada saat tanda tangan (rencana 8F2b Ruling 8 dan 10).
 */
export async function bacaDesaTerbaru(db: Db, desaId: string): Promise<Desa> {
  const [b] = await db.select().from(desa).where(eq(desa.id, desaId)).limit(1)
  if (!b) throw new Error('Desa tidak ditemukan saat membaca data terbaru.')
  return dariBarisDesa(b).desa
}

/** Slug desa menurut ID, atau null. Dibaca Konsol untuk membentuk alamat tujuan tiket bantuan tanpa memuat isi desa. */
export async function cariSlugDesaMenurutId(db: Db, id: string): Promise<string | null> {
  const [b] = await db.select({ slug: desa.slug }).from(desa).where(eq(desa.id, id)).limit(1)
  return b?.slug ?? null
}

/**
 * Istilah wilayah desa menurut basis data saat ini. `DesaRekam` dari pembaca alamat disimpan 30 detik, jadi sesudah desa
 * mengubah istilahnya (Pengaturan, Wilayah) jawaban yang menampilkan istilah membacanya langsung dari sini.
 */
export async function bacaIstilahWilayah(db: Db, desaId: string): Promise<Desa['istilahWilayah']> {
  const [b] = await db.select({ istilah: desa.istilahWilayah }).from(desa).where(eq(desa.id, desaId)).limit(1)
  return istilahWilayahSchema.parse(b?.istilah)
}
