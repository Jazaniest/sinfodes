import { sesiAdminSchema, type PenggunaSesi, type SesiAdmin } from '@sinfodes/kontrak/pengguna/schema'
import { daftarDusunDesa, type DesaRekam } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'

/**
 * Isi sesi panel: pengguna, desanya, daftar dusun desa (dipakai semua label alamat dan filter), identitas panel, dan modul.
 * Diperiksa skema kontrak sebelum dikirim, jadi bentuknya sama dengan API tiruan.
 */
export async function susunSesiAdmin(db: Db, desa: DesaRekam, pengguna: PenggunaSesi): Promise<SesiAdmin> {
  return sesiAdminSchema.parse({
    jenis: 'admin',
    pengguna,
    desa: desa.desa,
    dusun: await daftarDusunDesa(db),
    tampilanPanel: { warnaAksen: desa.warnaAksen, favicon: desa.desa.lambang ?? null },
    modul: desa.modul,
  })
}

/** Alasan masuk gagal, hanya untuk jejak audit desa. Tidak pernah dikirim ke klien: semuanya dijawab sama. */
export type AlasanGagal = 'tak-dikenal' | 'nonaktif' | 'kata-sandi-salah'
