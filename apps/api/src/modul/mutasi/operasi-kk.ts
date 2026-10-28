import { ubahHubungan } from '../keluarga/layanan-tulis'
import { setKepalaKeluarga } from '../keluarga/repositori'
import type { KonteksTulis } from '../penduduk/layanan-tulis'
import type { RekamKeluarga, RekamPenduduk } from '../penduduk/repositori'

/**
 * Periksa sebelum anggota keluar dari KK (meninggal, pindah). Kepala keluarga yang keluar wajib diganti oleh anggota yang tetap
 * tinggal, kecuali tidak ada lagi yang tinggal (SPEC-V0.2 §6.6). `anggota` = anggota Hidup KK sebelum ada yang keluar.
 * Mengembalikan pesan galat untuk field `penggantiKepalaId`, atau null.
 */
export function periksaPengganti(anggota: readonly RekamPenduduk[], kepalaId: string, keluarIds: readonly string[], penggantiId: string | null): string | null {
  const tinggal = anggota.filter((p) => !keluarIds.includes(p.id))
  if (!keluarIds.includes(kepalaId) || tinggal.length === 0) return null
  if (penggantiId === null) return 'Pilih kepala keluarga pengganti dari anggota yang tetap tinggal'
  return tinggal.some((p) => p.id === penggantiId) ? null : 'Pengganti harus anggota KK yang tetap tinggal'
}

/**
 * Memasang pengganti kepala setelah anggota keluar (status mereka sudah diubah pemanggil, jadi tidak lagi anggota Hidup):
 * pengganti mendapat hubungan Kepala Keluarga (tercatat di Riwayat), urutan pertama, dan menjadi `kepala_keluarga_id`. Tanpa
 * kepala yang keluar, tanpa pengganti, atau tanpa anggota yang tinggal, tidak ada yang berubah (KK tanpa anggota Hidup tetap
 * menyimpan kepala terakhirnya). Panggil sesudah `periksaPengganti`.
 */
export async function keluarkanDariKk(
  k: KonteksTulis,
  kk: RekamKeluarga,
  anggota: readonly RekamPenduduk[],
  keluarIds: readonly string[],
  penggantiId: string | null,
): Promise<void> {
  if (!keluarIds.includes(kk.kepalaKeluargaId) || penggantiId === null) return
  const tinggal = anggota.filter((p) => !keluarIds.includes(p.id))
  const pengganti = tinggal.find((p) => p.id === penggantiId)
  if (!pengganti) return
  await ubahHubungan(k, pengganti, 'Kepala Keluarga', { urutanKk: Math.min(...tinggal.map((p) => p.urutanKk)) - 1 })
  await setKepalaKeluarga(k.db, kk.id, pengganti.id)
}
