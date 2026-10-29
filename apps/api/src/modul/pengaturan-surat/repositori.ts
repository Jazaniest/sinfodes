import type { ModeUrutan } from '@sinfodes/kontrak/surat/nomor-surat'
import { pengaturanSuratSchema, type PengaturanSurat } from '@sinfodes/kontrak/surat/pengaturan'
import { pengaturanBawaan } from '@sinfodes/kontrak/surat/pengaturan-bawaan'
import type { TataLetakSurat } from '@sinfodes/kontrak/surat/tata-letak'
import { eq } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { desa, pengaturanSurat } from '../../basisdata/skema'

/**
 * Pengaturan surat desa: barisnya, atau `pengaturanBawaan` bila desa belum punya baris (GET tidak menulis). Bentuknya
 * diperiksa skema kontrak di batas ini, jadi baris yang rusak menjadi galat server, bukan jawaban yang menyimpang.
 */
export async function bacaPengaturanSurat(db: Db, desaId: string): Promise<PengaturanSurat> {
  const [b] = await db.select().from(pengaturanSurat).where(eq(pengaturanSurat.desaId, desaId))
  if (!b) return pengaturanBawaan(desaId)
  return pengaturanSuratSchema.parse({
    desaId: b.desaId,
    tataLetak: b.tataLetak,
    modeTandaTangan: b.modeTandaTangan,
    formatNomor: b.formatNomor,
    urutan: b.urutan,
  })
}

type KolomPengaturan = { tataLetak?: TataLetakSurat; formatNomor?: string; urutan?: ModeUrutan }

/**
 * Menulis pengaturan surat desa. Baris dibuat dari `pengaturanBawaan` bila belum ada; bila sudah ada, HANYA kolom yang diberi
 * yang diperbarui. Karena itu `PUT /surat/tata-letak` dan `PUT /pengaturan/penomoran` yang berjalan serentak pada desa tanpa
 * baris tidak saling menimpa kolom: yang kedua menunggu indeks unik, lalu memperbarui kolomnya sendiri (rencana 8F1 Ruling 9).
 */
export async function upsertPengaturanSurat(db: Db, desaId: string, kolom: KolomPengaturan): Promise<void> {
  const dasar = pengaturanBawaan(desaId)
  const set: Partial<typeof pengaturanSurat.$inferInsert> = {}
  if (kolom.tataLetak !== undefined) set.tataLetak = kolom.tataLetak
  if (kolom.formatNomor !== undefined) set.formatNomor = kolom.formatNomor
  if (kolom.urutan !== undefined) set.urutan = kolom.urutan
  await db
    .insert(pengaturanSurat)
    .values({
      desaId,
      tataLetak: kolom.tataLetak ?? dasar.tataLetak,
      modeTandaTangan: dasar.modeTandaTangan,
      formatNomor: kolom.formatNomor ?? dasar.formatNomor,
      urutan: kolom.urutan ?? dasar.urutan,
    })
    .onConflictDoUpdate({ target: pengaturanSurat.desaId, set })
}

/** Kode desa di nomor surat dari basis data. Sengaja bukan dari `DesaRekam` permintaan: itu cache alamat 30 detik dan bisa basi sesudah diubah. */
export async function bacaKodeSurat(db: Db, desaId: string): Promise<string> {
  const [b] = await db.select({ kodeSurat: desa.kodeSurat }).from(desa).where(eq(desa.id, desaId))
  return b?.kodeSurat ?? ''
}

export async function tulisKodeSurat(db: Db, desaId: string, kodeSurat: string): Promise<void> {
  await db.update(desa).set({ kodeSurat }).where(eq(desa.id, desaId))
}
