import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { BahanBukuAgenda } from '@sinfodes/kontrak/buku/agenda'
import { eq, isNotNull } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { jenisSurat, penduduk, permohonan, suratMasuk } from '../../basisdata/skema'

/**
 * Bahan Buku Agenda dari PostgreSQL: surat keluar (setiap permohonan yang pernah terbit, termasuk yang kemudian dibatalkan) dan
 * seluruh register surat masuk desa. Dua kueri sempit: nama pemohon dan nama jenis ikut sebagai teks biasa, jadi tidak ada sandi
 * yang dibuka dan tabel penduduk tidak dimuat (8F3 Ruling 16). RLS membatasi desa. Hanya peran dengan `buku.lihat` sampai di sini.
 */
export async function bacaBahanBukuAgenda(k: { db: Db }): Promise<BahanBukuAgenda> {
  const keluar = await k.db
    .select({ terbitPada: permohonan.terbitPada, nomor: permohonan.terbitNomor, pemohon: penduduk.nama, jenis: jenisSurat.nama })
    .from(permohonan)
    .innerJoin(penduduk, eq(penduduk.id, permohonan.pemohonId))
    .innerJoin(jenisSurat, eq(jenisSurat.id, permohonan.jenisId))
    .where(isNotNull(permohonan.terbitPada))
  const masuk = await k.db.select().from(suratMasuk)
  return {
    keluar: keluar.flatMap((b) => (b.terbitPada === null || b.nomor === null ? [] : [{ terbitPada: waktuIsoWib(b.terbitPada), nomor: b.nomor, pemohon: b.pemohon, jenis: b.jenis }])),
    masuk: masuk.map((s) => ({
      diterima: s.diterima, dicatatPada: waktuIsoWib(s.dicatatPada), nomor: s.nomor, tanggalSurat: s.tanggalSurat, pengirim: s.pengirim, perihal: s.perihal,
    })),
  }
}
