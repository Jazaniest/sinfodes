import type { Mutasi } from '@sinfodes/kontrak/mutasi/schema'
import type { Db } from '../../basisdata/klien'
import { mutasi, mutasiPenduduk } from '../../basisdata/skema'

/**
 * Menyimpan satu mutasi beserta daftar penduduknya (urutan = posisi di `pendudukIds`). Penduduk yang disebut harus sudah ada
 * di tabel `penduduk` (kunci asing), jadi kelahiran dan kedatangan menyisipkan penduduknya lebih dulu.
 */
export async function simpanMutasi(db: Db, m: Mutasi): Promise<void> {
  await db.insert(mutasi).values({
    id: m.id,
    desaId: m.desaId,
    jenis: m.jenis,
    tanggal: m.tanggal,
    dicatatOlehId: m.dicatatOleh.id,
    dicatatOlehNama: m.dicatatOleh.nama,
    dicatatPada: new Date(m.dicatatPada),
    rincian: m.rincian,
  })
  await db.insert(mutasiPenduduk).values(m.pendudukIds.map((pendudukId, urutan) => ({ mutasiId: m.id, pendudukId, desaId: m.desaId, urutan })))
}
