import type { BahanBukuPenduduk } from '@sinfodes/kontrak/buku/penduduk'
import type { BarisPenduduk } from '@sinfodes/kontrak/penduduk/schema'
import { bacaIstilahWilayah, daftarDusunDesa } from '../../basisdata/desa'
import type { Db } from '../../basisdata/klien'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { bentukMutasi } from '../mutasi/layanan'
import { bacaSemuaMutasi } from '../mutasi/repositori'
import { bentukPenduduk } from '../penduduk/layanan'
import { bacaKeluargaDesa, bacaPendudukDesa } from '../penduduk/repositori'

/**
 * Bahan buku penduduk dari PostgreSQL: penduduk semua status (NIK dibuka dari sandi) dengan nomor KK, mutasi, dusun, istilah
 * wilayah, dan jumlah anggota Hidup per KK. Hanya Operator, Sekretaris, Kepala Desa, dan sesi bantuan yang sampai di sini
 * (`buku.lihat`), semuanya berhak atas seluruh desa, jadi tidak ada pembatasan dusun.
 */
export async function bacaBahanBukuPenduduk(k: { db: Db; penyandi: Penyandi; hariIni: Date; desaId: string }): Promise<BahanBukuPenduduk> {
  const [rekam, rekamKk, dusun, istilah, mutasi] = await Promise.all([
    bacaPendudukDesa(k.db, null),
    bacaKeluargaDesa(k.db, null),
    daftarDusunDesa(k.db),
    bacaIstilahWilayah(k.db, k.desaId),
    bacaSemuaMutasi(k.db),
  ])
  const nomorKk = new Map(rekamKk.map((r) => [r.id, k.penyandi.bukaSandi(r.nomorKkSandi, ruang.nomorKk(r.desaId))] as const))
  const urutId = [...rekam].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const penduduk: BarisPenduduk[] = urutId.map((r) => ({ ...bentukPenduduk(r, k.penyandi), nomorKk: nomorKk.get(r.keluargaId) ?? '' }))
  const hidupPerKk = new Map<string, number>()
  for (const p of rekam) if (p.statusDasar === 'Hidup') hidupPerKk.set(p.keluargaId, (hidupPerKk.get(p.keluargaId) ?? 0) + 1)
  return {
    hariIni: k.hariIni,
    dusun,
    istilah,
    penduduk,
    mutasi: mutasi.map((m) => bentukMutasi(m.rekam, m.pendudukIds)),
    keluarga: rekamKk.map((r) => ({ dusunId: r.dusunId, jumlahAnggota: hidupPerKk.get(r.id) ?? 0 })),
  }
}
