import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { jenisSuratSchema, type JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import { asc, eq } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { jenisSurat } from '../../basisdata/skema'

/**
 * Baris `jenis_surat` menjadi `JenisSurat` kontrak. Diperiksa skema di batas ini (gagal tertutup): `isian`, `syarat`, dan
 * `tata_letak` adalah jsonb, jadi bentuknya dijaga di sini dan saat ditulis. Waktu arsip ISO WIB, sama dengan API tiruan.
 */
export function dariBaris(b: typeof jenisSurat.$inferSelect): JenisSurat {
  return jenisSuratSchema.parse({
    id: b.id,
    desaId: b.desaId,
    kode: b.kode,
    nama: b.nama,
    klasifikasi: b.klasifikasi,
    subjek: b.subjek,
    isian: b.isian,
    bolehAtasNama: b.bolehAtasNama,
    wajibParaf: b.wajibParaf,
    masaBerlakuBulan: b.masaBerlakuBulan,
    online: b.online,
    syarat: b.syarat,
    teks: b.teks,
    aktif: b.aktif,
    asal: b.asal,
    diarsipkan: b.diarsipkan ? waktuIsoWib(b.diarsipkan) : null,
    tataLetak: b.tataLetak,
  })
}

/** Seluruh katalog desa pada konteks (RLS), dalam urutan sisip. */
export async function bacaJenisDesa(db: Db): Promise<JenisSurat[]> {
  return (await db.select().from(jenisSurat).orderBy(asc(jenisSurat.urutan))).map(dariBaris)
}

/** Satu jenis menurut id, atau null bila tidak ada atau milik desa lain (RLS menyembunyikannya). `kunci` mengunci barisnya (FOR UPDATE). */
export async function bacaJenisSatu(db: Db, id: string, opsi: { kunci?: boolean } = {}): Promise<JenisSurat | null> {
  const kueri = db.select().from(jenisSurat).where(eq(jenisSurat.id, id))
  const [b] = await (opsi.kunci ? kueri.for('update') : kueri)
  return b ? dariBaris(b) : null
}

/** Nama indeks unik `(desa_id, kode)` di migrasi 0011: tabrakannya berarti dua permintaan serentak memakai kode yang sama. */
export const INDEKS_KODE_JENIS = 'jenis_surat_desa_id_kode_key'

/** Menyisipkan jenis baru di urutan terakhir katalog (kolom `urutan` diisi basis data). */
export async function sisipJenis(db: Db, j: JenisSurat): Promise<void> {
  await db.insert(jenisSurat).values({
    id: j.id,
    desaId: j.desaId,
    kode: j.kode,
    nama: j.nama,
    klasifikasi: j.klasifikasi,
    subjek: j.subjek,
    isian: j.isian,
    bolehAtasNama: j.bolehAtasNama,
    wajibParaf: j.wajibParaf,
    masaBerlakuBulan: j.masaBerlakuBulan,
    online: j.online,
    syarat: j.syarat,
    teks: j.teks,
    aktif: j.aktif,
    asal: j.asal,
    diarsipkan: j.diarsipkan ? new Date(j.diarsipkan) : null,
    tataLetak: j.tataLetak,
  })
}

/**
 * Menulis kolom jenis yang boleh diubah desa (hak kolom migrasi 0011): isi yang disunting, saklar, dan waktu arsip. `kode`,
 * `subjek`, dan `asal` sengaja tidak ada di sini. `diarsipkan` null/Date menandai aktifkan-lagi/arsipkan.
 */
export async function tulisKolomJenis(db: Db, j: JenisSurat, arsip: Date | null): Promise<void> {
  await db
    .update(jenisSurat)
    .set({
      nama: j.nama,
      klasifikasi: j.klasifikasi,
      isian: j.isian,
      bolehAtasNama: j.bolehAtasNama,
      wajibParaf: j.wajibParaf,
      masaBerlakuBulan: j.masaBerlakuBulan,
      online: j.online,
      syarat: j.syarat,
      teks: j.teks,
      aktif: j.aktif,
      diarsipkan: arsip,
      tataLetak: j.tataLetak,
    })
    .where(eq(jenisSurat.id, j.id))
}

/** Menghapus satu jenis; kembalian 0 berarti tidak ada baris yang terhapus (mis. dicegah kebijakan basis data). */
export async function hapusBarisJenis(db: Db, id: string): Promise<number> {
  return (await db.delete(jenisSurat).where(eq(jenisSurat.id, id)).returning({ id: jenisSurat.id })).length
}
