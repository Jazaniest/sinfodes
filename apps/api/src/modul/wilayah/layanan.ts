import { jabatanBawaan } from '@sinfodes/kontrak/pengaturan/pengguna'
import { nomoriSusunan, susunanSama, ubahWilayahSchema, wilayahDesaSchema, type WilayahDesa } from '@sinfodes/kontrak/pengaturan/wilayah'
import { namaDusun } from '@sinfodes/kontrak/wilayah/alamat'
import type { Desa, Dusun } from '@sinfodes/kontrak/wilayah/schema'
import { bacaIstilahWilayah, daftarDusunDesa } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import { adaDataKependudukan, akunKadusDi, geserNomorDusun, hapusDusun, sisipDusun, ubahDusun, ubahIstilahWilayah, ubahJabatan } from './repositori'

const PESAN_BERUBAH = 'Susunan wilayah sudah berubah. Muat ulang halaman, lalu ulangi perubahan.'

/** Istilah dan dusun desa pada konteks (urut nomor), beserta apakah susunannya sudah terkunci. */
export async function wilayahDesa(db: Db, desaId: string): Promise<WilayahDesa> {
  const istilah = await bacaIstilahWilayah(db, desaId)
  const dusun = await daftarDusunDesa(db)
  return wilayahDesaSchema.parse({ istilah, dusun, susunanTerkunci: await adaDataKependudukan(db) })
}

/** ID dusun baru yang belum dipakai desa ini, mis. "dsn_tl_3". ID dusun yang dihapus dalam penyimpanan yang sama tidak dipakai ulang. */
function idDusunBaru(desa: Pick<Desa, 'kodeSurat'>, terpakai: Set<string>): string {
  const awalan = `dsn_${desa.kodeSurat.toLowerCase()}_`
  let n = 1
  while (terpakai.has(`${awalan}${n}`)) n += 1
  terpakai.add(`${awalan}${n}`)
  return `${awalan}${n}`
}

/**
 * Menyimpan istilah dan susunan wilayah. Selama desa belum punya penduduk atau KK, susunan boleh berubah: dusun dikenali dari
 * ID-nya, ID yang bukan milik desa ini berarti dusun baru, nomor mengikuti urutan, dan dusun yang masih dipakai akun Kepala
 * Dusun tidak boleh dihapus (jabatan bawaan akun itu ikut nomor baru). Sesudahnya hanya nama yang berubah dan susunan
 * yang berbeda ditolak 409. Perbedaan sengaja dari API tiruan: istilah ikut tersimpan juga saat susunan terkunci (tiruan
 * mengabaikannya padahal layar membolehkan). Penyelarasan pengurus Lembaga Desa menunggu tabel lembaga (8G).
 */
export async function aturWilayah(k: { db: Db; desa: Desa }, mentah: unknown): Promise<WilayahDesa> {
  const isian = ubahWilayahSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const ids = isian.data.dusun.map((d) => d.id)
  if (new Set(ids).size !== ids.length) throw galatField('dusun', 'Setiap dusun hanya boleh tampil sekali dalam susunan')
  const lama = await daftarDusunDesa(k.db)

  if (await adaDataKependudukan(k.db)) {
    if (!susunanSama(isian.data, lama)) throw new GalatApp('CONFLICT', PESAN_BERUBAH, 409)
    for (const [i, baru] of isian.data.dusun.entries()) await ubahDusun(k.db, lama[i].id, { nama: baru.nama, kepalaDusun: baru.kepalaDusun, rw: baru.rw })
  } else {
    await aturSusunan(k, lama, isian.data)
  }
  await ubahIstilahWilayah(k.db, k.desa.id, isian.data.istilah)
  return wilayahDesa(k.db, k.desa.id)
}

async function aturSusunan(k: { db: Db; desa: Desa }, lama: readonly Dusun[], isian: ReturnType<typeof ubahWilayahSchema.parse>): Promise<void> {
  const istilahLama = await bacaIstilahWilayah(k.db, k.desa.id)
  const tetap = new Set(isian.dusun.map((d) => d.id))
  const dihapus = lama.filter((d) => !tetap.has(d.id))
  const pemakai = await akunKadusDi(k.db, dihapus.map((d) => d.id))
  for (const d of dihapus) {
    const kadus = pemakai.find((p) => p.dusunId === d.id)
    if (kadus) {
      throw new GalatApp('CONFLICT', `${namaDusun(d, istilahLama)} masih dipakai akun ${kadus.nama}. Ganti peran akun itu dulu di Pengaturan › Pengguna.`, 409)
    }
  }

  const terpakai = new Set(lama.map((d) => d.id))
  const baru = nomoriSusunan(isian.dusun).map((d, i) => {
    const asal = lama.find((x) => x.id === d.id)
    return { asal, id: asal?.id ?? idDusunBaru(k.desa, terpakai), nomor: i + 1, d }
  })
  // Kepala Dusun yang dusunnya bertahan: jabatan bawaan ("Kepala Dusun II") ikut nomor baru, jabatan yang diubah manual tidak.
  const kadus = await akunKadusDi(k.db, baru.filter((b) => b.asal).map((b) => b.id))

  await hapusDusun(k.db, dihapus.map((d) => d.id))
  await geserNomorDusun(k.db)
  for (const b of baru) {
    const isi = { nomor: b.nomor, nama: b.d.nama, kepalaDusun: b.d.kepalaDusun, rw: b.d.rw }
    if (b.asal) await ubahDusun(k.db, b.id, isi)
    else await sisipDusun(k.db, { id: b.id, desaId: k.desa.id, posyandu: '', ...isi })
  }
  for (const p of kadus) {
    const sebelum = lama.find((d) => d.id === p.dusunId)
    const sesudah = baru.find((b) => b.id === p.dusunId)
    if (sebelum && sesudah && p.jabatan === jabatanBawaan('kadus', sebelum)) await ubahJabatan(k.db, p.id, jabatanBawaan('kadus', { nomor: sesudah.nomor }))
  }
}
