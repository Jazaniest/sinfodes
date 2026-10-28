import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { keluarga, penduduk } from '../../basisdata/skema'
import type { RekamKeluarga, RekamPenduduk } from '../penduduk/repositori'

/** Satu KK menurut id; RLS membatasi desa dan Kepala Dusun hanya KK dusunnya. Tidak ada = undefined. */
export async function bacaKeluargaSatu(db: Db, id: string, dusunSaja: string | null): Promise<RekamKeluarga | undefined> {
  const [b] = await db
    .select()
    .from(keluarga)
    .where(and(eq(keluarga.id, id), dusunSaja === null ? undefined : eq(keluarga.dusunId, dusunSaja)))
    .limit(1)
  return b
}

export const setKepalaKeluarga = async (db: Db, id: string, kepalaId: string): Promise<void> => {
  await db.update(keluarga).set({ kepalaKeluargaId: kepalaId }).where(eq(keluarga.id, id))
}

/** Anggota KK = penduduk Hidup di KK itu, berurutan menurut `urutan_kk` lalu id (rencana 8E1 Ruling 3 dan 4). */
export const bacaAnggotaHidup = (db: Db, keluargaId: string, dusunSaja: string | null): Promise<RekamPenduduk[]> =>
  db
    .select()
    .from(penduduk)
    .where(and(eq(penduduk.keluargaId, keluargaId), eq(penduduk.statusDasar, 'Hidup'), dusunSaja === null ? undefined : eq(penduduk.dusunId, dusunSaja)))
    .orderBy(asc(penduduk.urutanKk), asc(penduduk.id))
