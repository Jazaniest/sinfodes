import { tanggalIsoWib } from '@/domain/format/tanggal'
import { buatNomorKk } from '@/domain/keluarga/nomor-kk'
import type { DetailKeluarga, Keluarga } from '@/domain/keluarga/schema'
import type { Pelaku } from '@/domain/mutasi/schema'
import type { HubunganKeluarga } from '@/domain/penduduk/enum'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { DbDemo } from './tipe-db'
import { catatRiwayat } from './tulis'

/** Nomor KK baru: kode wilayah desa + tanggal terbit hari ini + nomor urut 8001-9999 yang belum dipakai (SPEC §12.5). */
export function nomorKkBaru(db: DbDemo, kodeWilayah: string, sekarang: Date): string {
  const tanggalTerbit = tanggalIsoWib(sekarang)
  const terpakai = new Set(db.keluarga.map((k) => k.nomorKk))
  for (let nomorUrut = 8001; nomorUrut <= 9999; nomorUrut++) {
    const nomor = buatNomorKk({ kodeWilayah, tanggalTerbit, nomorUrut })
    if (!terpakai.has(nomor)) return nomor
  }
  throw new Error('Nomor urut KK hari ini habis')
}

/** Ubah hubungan dalam keluarga dan catat di Riwayat. Panggil di dalam ubahDb. */
export function ubahHubungan(db: DbDemo, p: Penduduk, baru: HubunganKeluarga, oleh: Pelaku, waktu: string): void {
  if (p.hubunganKeluarga === baru) return
  catatRiwayat(db, p, [{ field: 'hubunganKeluarga', nilaiLama: p.hubunganKeluarga, nilaiBaru: baru }], oleh, waktu)
  p.hubunganKeluarga = baru
  p.diubahPada = waktu
}

/**
 * Periksa sebelum anggota keluar dari KK (meninggal, pindah). Kepala keluarga yang keluar wajib diganti oleh
 * anggota yang tetap tinggal, kecuali tidak ada lagi yang tinggal (SPEC §6.6). Mengembalikan pesan galat atau null.
 */
export function periksaPengganti(kk: Keluarga, keluarIds: readonly string[], penggantiId: string | null): string | null {
  const tinggal = kk.anggotaIds.filter((id) => !keluarIds.includes(id))
  if (!keluarIds.includes(kk.kepalaKeluargaId) || tinggal.length === 0) return null
  if (penggantiId === null) return 'Pilih kepala keluarga pengganti dari anggota yang tetap tinggal'
  return tinggal.includes(penggantiId) ? null : 'Pengganti harus anggota KK yang tetap tinggal'
}

/** Keluarkan anggota dari KK dan pasang pengganti kepala bila perlu. Panggil di dalam ubahDb setelah periksaPengganti. */
export function keluarkanDariKk(
  db: DbDemo,
  kk: Keluarga,
  keluarIds: readonly string[],
  penggantiId: string | null,
  oleh: Pelaku,
  waktu: string,
): void {
  const kepalaKeluar = keluarIds.includes(kk.kepalaKeluargaId)
  kk.anggotaIds = kk.anggotaIds.filter((id) => !keluarIds.includes(id))
  if (!kepalaKeluar || penggantiId === null || !kk.anggotaIds.includes(penggantiId)) return
  const pengganti = db.penduduk.find((p) => p.id === penggantiId)
  if (!pengganti) return
  ubahHubungan(db, pengganti, 'Kepala Keluarga', oleh, waktu)
  kk.kepalaKeluargaId = pengganti.id
  kk.anggotaIds = [pengganti.id, ...kk.anggotaIds.filter((id) => id !== pengganti.id)]
}

/** Respons detail KK: anggota berurutan seperti di KK. */
export function detailDari(kk: Keluarga, penduduk: readonly Penduduk[]): DetailKeluarga {
  const perId = new Map(penduduk.map((p) => [p.id, p] as const))
  return {
    keluarga: kk,
    anggota: kk.anggotaIds.flatMap((id) => {
      const p = perId.get(id)
      return p ? [p] : []
    }),
  }
}
