import type { HasilCari } from '@sinfodes/kontrak/cari/schema'
import { cocokNama } from '@sinfodes/kontrak/penduduk/cari'
import { boleh, cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { KonteksLayanan } from '../penduduk/layanan'
import { bacaBaris, bacaPasangan, syaratDaftar, syaratIdPermohonan, urutanPerPenduduk } from '../permohonan/repositori'

const MAKS_PER_JENIS = 5

/**
 * Pencarian surat di Cari global (SPEC-V0.2 §5.4, diisi 8F2a): kata bergaris miring dicari di nomor surat, selain itu di nama
 * pemohon; terbaru masuk dulu, paling banyak lima. Kepala Dusun hanya mendapat surat dusunnya. Peran tanpa `surat.lihat`
 * mendapat larik kosong. Tidak membuka satu pun sandi: hanya nama pemohon yang dibutuhkan.
 */
export async function cariSurat(k: Pick<KonteksLayanan, 'db' | 'pelaku'>, kata: string): Promise<HasilCari['surat']> {
  if (!boleh(k.pelaku.peran, 'surat.lihat')) return []
  const pasangan = await bacaPasangan(k.db, syaratDaftar({ dusunSaja: cakupanDusun(k.pelaku) }))
  const nomor = kata.toUpperCase()
  const cocok = pasangan
    .filter((p) => (kata.includes('/') ? (p.nomor?.includes(nomor) ?? false) : cocokNama(p.pemohonNama, kata)))
    .slice(0, MAKS_PER_JENIS)
  if (cocok.length === 0) return []
  const baris = await bacaBaris(k.db, syaratIdPermohonan(cocok.map((p) => p.id)), urutanPerPenduduk())
  return baris.map((b) => ({ id: b.id, kode: b.jenisKode, jenisNama: b.jenisNama, pemohon: b.pemohonNama, nomor: b.nomor, status: b.status as HasilCari['surat'][number]['status'] }))
}
