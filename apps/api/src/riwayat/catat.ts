import { randomUUID } from 'node:crypto'
import type { Aktivitas } from '@sinfodes/kontrak/aktivitas/schema'
import type { Pelaku } from '@sinfodes/kontrak/mutasi/schema'
import type { Perubahan } from '@sinfodes/kontrak/penduduk/perubahan'
import type { Db } from '../basisdata/klien'
import { aktivitas, riwayatPenduduk } from '../basisdata/skema'
import type { Penyandi } from '../kripto/penyandi'
import type { PelakuPanel } from '../lapisan/konteks'
import { sandikanNilaiRiwayat } from './sandi'

/** Potret pelaku untuk riwayat dan aktivitas: nama pengguna bisa berubah kelak, catatan lama tidak ikut berubah. */
export const pelakuKontrak = (p: Pick<PelakuPanel, 'id' | 'nama'>): Pelaku => ({ id: p.id, nama: p.nama })

/**
 * Mencatat perubahan field penduduk ke Riwayat, satu baris per perubahan. Dipanggil dalam transaksi permintaan yang sama
 * dengan perubahan datanya, jadi keduanya berhasil atau gagal bersama (rencana 8E1). Nilai NIK dan telepon disandikan di
 * ruang riwayat desa (tidak pernah polos di basis data, SPEC-V0.3 §7.6); field lain apa adanya. Penyamaran sesi bantuan ada
 * di lapisan jawaban.
 */
export async function catatRiwayat(db: Db, penyandi: Penyandi, p: { id: string; desaId: string }, perubahan: readonly Perubahan[], oleh: Pelaku, waktu: string): Promise<void> {
  if (perubahan.length === 0) return
  await db.insert(riwayatPenduduk).values(
    perubahan.map((u) => ({
      id: `rwy_${randomUUID()}`,
      desaId: p.desaId,
      pendudukId: p.id,
      field: u.field,
      nilaiLama: sandikanNilaiRiwayat(penyandi, p.desaId, u.field, u.nilaiLama),
      nilaiBaru: sandikanNilaiRiwayat(penyandi, p.desaId, u.field, u.nilaiBaru),
      olehId: oleh.id,
      olehNama: oleh.nama,
      waktu: new Date(waktu),
    })),
  )
}

/** Mencatat satu kejadian ke Buku hari ini (SPEC-V0.2 §5.3). Ringkasan tidak boleh memuat NIK, nomor KK, atau telepon. */
export async function catatAktivitas(db: Db, a: Omit<Aktivitas, 'id'>): Promise<void> {
  await db.insert(aktivitas).values({
    id: `akt_${randomUUID()}`,
    desaId: a.desaId,
    dusunId: a.dusunId,
    waktu: new Date(a.waktu),
    jenis: a.jenis,
    ringkasan: a.ringkasan,
    olehId: a.oleh?.id ?? null,
    olehNama: a.oleh?.nama ?? null,
    rujukanJenis: a.rujukan?.jenis ?? null,
    rujukanId: a.rujukan?.id ?? null,
  })
}
