import type { PendudukStatistik } from '@sinfodes/kontrak/statistik/penduduk'
import { and, eq } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { penduduk } from '../../basisdata/skema'

export type BarisStatistik = PendudukStatistik & { keluargaId: string }

/**
 * Penduduk Hidup cakupan dengan kolom yang dibaca statistik saja; tidak satu pun kolom bersandi (NIK, telepon) ikut dibaca.
 * Bentuk enumerasi dipercaya dari basis data, seperti `bentukPenduduk`.
 */
export async function bacaPendudukStatistik(db: Db, dusunSaja: string | null): Promise<BarisStatistik[]> {
  const baris = await db
    .select({
      keluargaId: penduduk.keluargaId,
      statusDasar: penduduk.statusDasar,
      jenisKelamin: penduduk.jenisKelamin,
      tanggalLahir: penduduk.tanggalLahir,
      dusunId: penduduk.dusunId,
      agama: penduduk.agama,
      pendidikan: penduduk.pendidikan,
      pekerjaan: penduduk.pekerjaan,
      statusPerkawinan: penduduk.statusPerkawinan,
      ktpEl: penduduk.ktpEl,
    })
    .from(penduduk)
    .where(and(eq(penduduk.statusDasar, 'Hidup'), dusunSaja === null ? undefined : eq(penduduk.dusunId, dusunSaja)))
  return baris as BarisStatistik[]
}
