import { sesiAdminSchema, type PenggunaSesi, type SesiAdmin } from '@sinfodes/kontrak/pengguna/schema'
import { daftarDusunDesa, type DesaRekam } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import type { PelakuPanel } from '../../lapisan/konteks'
import { cabutSesiBantuan } from '../../sesi/repositori-bantuan'
import { cabutSesi } from '../../sesi/repositori'

/**
 * Isi sesi panel: pengguna, desanya, daftar dusun desa (dipakai semua label alamat dan filter), identitas panel, dan modul.
 * Diperiksa skema kontrak sebelum dikirim, jadi bentuknya sama dengan API tiruan.
 */
export async function susunSesiAdmin(
  db: Db,
  desa: DesaRekam,
  pengguna: PenggunaSesi,
  bantuan?: { sampai: Date; sembunyikanDataPribadi: boolean },
): Promise<SesiAdmin> {
  return sesiAdminSchema.parse({
    jenis: 'admin',
    pengguna,
    desa: desa.desa,
    dusun: await daftarDusunDesa(db),
    tampilanPanel: { warnaAksen: desa.warnaAksen, favicon: desa.desa.lambang ?? null },
    modul: desa.modul,
    // Hanya sesi bantuan Tim Sinfodes: batas akses dan apakah NIK serta nomor KK disamarkan (SPEC-V0.2 §5.2).
    ...(bantuan ? { bantuan: { sampai: bantuan.sampai.toISOString(), sembunyikanDataPribadi: bantuan.sembunyikanDataPribadi } } : {}),
  })
}

/** Mencabut sesi panel pelaku: sesi bantuan di tabelnya sendiri, sesi pengguna desa di tabel `sesi`. */
export async function cabutSesiPanel(db: Db, pelaku: PelakuPanel, sekarang: Date): Promise<void> {
  if (pelaku.bantuan) await cabutSesiBantuan(db, pelaku.sesiId, sekarang)
  else await cabutSesi(db, pelaku.sesiId, sekarang)
}

/** Alasan masuk gagal, hanya untuk jejak audit desa. Tidak pernah dikirim ke klien: semuanya dijawab sama. */
export type AlasanGagal = 'tak-dikenal' | 'nonaktif' | 'kata-sandi-salah'
