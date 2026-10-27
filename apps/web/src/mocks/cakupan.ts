import type { Mutasi } from '@/domain/mutasi/schema'
import { cakupanDusun } from '@/domain/pengguna/hak-akses'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { ambilDb } from './db'

/** Data milik pengguna: desanya saja; Kepala Dusun hanya dusunnya (SPEC §3.4, §5.1). */
export function dataMilik(pengguna: PenggunaSesi) {
  const db = ambilDb()
  const dusunSaja = cakupanDusun(pengguna)
  const diDalam = (x: { desaId: string; dusunId: string | null }) =>
    x.desaId === pengguna.desaId && (dusunSaja === null || x.dusunId === dusunSaja)
  const penduduk = db.penduduk.filter(diDalam)
  const idPenduduk = new Set(penduduk.map((p) => p.id))
  const semuaKeluarga = db.keluarga.filter(diDalam)
  return {
    db,
    dusunSaja,
    dusun: db.dusun.filter((d) => d.desaId === pengguna.desaId),
    penduduk,
    /** KK yang masih punya anggota: yang tampil di daftar dan dihitung. */
    keluarga: semuaKeluarga.filter((k) => k.anggotaIds.length > 0),
    /** Termasuk KK yang seluruh anggotanya sudah meninggal/pindah: untuk detail dan nomor KK mantan penduduk. */
    semuaKeluarga,
    mutasi: db.mutasi.filter((m) => m.desaId === pengguna.desaId && m.pendudukIds.some((id) => idPenduduk.has(id))),
    riwayat: db.riwayat.filter((r) => idPenduduk.has(r.pendudukId)),
    aktivitas: db.aktivitas.filter(diDalam),
    laporanData: db.laporanData.filter(diDalam),
    permohonan: db.permohonan.filter(diDalam),
    jenisSurat: db.jenisSurat.filter((j) => j.desaId === pengguna.desaId),
  }
}

/** ID penduduk yang tercatat datang pada tahun tertentu (preset "Pendatang tahun ini"). */
export function idPendatangTahun(mutasi: readonly Mutasi[], tahun: string): Set<string> {
  return new Set(mutasi.filter((m) => m.jenis === 'datang' && m.tanggal.startsWith(tahun)).flatMap((m) => m.pendudukIds))
}
