import type { z } from 'zod'
import type { Aktivitas } from '@/domain/aktivitas/schema'
import { galatDariZod } from '@/domain/format/galat-isian'
import type { Pelaku } from '@/domain/mutasi/schema'
import type { Perubahan } from '@/domain/penduduk/perubahan'
import type { Penduduk } from '@/domain/penduduk/schema'
import { boleh, type Kemampuan } from '@/domain/pengguna/hak-akses'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { Dusun } from '@/domain/wilayah/schema'
import { balasGalat } from './http'
import { butuhPengguna } from './sesi-mock'
import type { DbDemo } from './tipe-db'

/** Pengguna yang punya kemampuan tertentu, atau Response galat yang langsung dikembalikan handler. */
export function butuhKemampuan(request: Request, kemampuan: Kemampuan, pesan: string): Pengguna | Response {
  const pengguna = butuhPengguna(request)
  if (pengguna instanceof Response) return pengguna
  return boleh(pengguna.peran, kemampuan) ? pengguna : balasGalat('FORBIDDEN', pesan, 403)
}

/** Hanya Operator dan Sekretaris Desa yang boleh mengubah data kependudukan (SPEC §5.1). */
export const butuhPengubah = (request: Request): Pengguna | Response =>
  butuhKemampuan(request, 'penduduk.ubah', 'Peran Anda tidak berhak mengubah data kependudukan.')

export const pelakuDari = (p: Pengguna): Pelaku => ({ id: p.id, nama: p.nama })

export const bacaJson = (request: Request): Promise<unknown> => request.json().catch(() => null)

/** Galat Zod → `fields` respons VALIDATION, mis. { "bayi.nama": "Nama bayi wajib diisi" }. Satu pesan per field. */
export function galatIsian(galat: z.ZodError): Record<string, string> {
  return galatDariZod(galat)
}

export function balasIsianTidakValid(galat: z.ZodError): Response {
  return balasGalat('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, galatIsian(galat))
}

/** Galat yang terkait satu field (SPEC §3.4: `fields` berisi pesan per field). */
export function balasField(field: string, pesan: string, kode: 'VALIDATION' | 'CONFLICT' = 'VALIDATION'): Response {
  return balasGalat(kode, pesan, kode === 'CONFLICT' ? 409 : 422, { [field]: pesan })
}

/** ID baru yang belum dipakai di basis data: `${awalan}_` + 6 karakter base36. */
export function idBaru(db: DbDemo, awalan: string): string {
  const terpakai = new Set<string>()
  for (const daftar of [
    db.penduduk, db.keluarga, db.mutasi, db.riwayat, db.aktivitas, db.laporanData, db.impor, db.permohonan, db.suratMasuk, db.notifikasi,
    db.pengaduan,
  ]) {
    for (const x of daftar) terpakai.add(x.id)
  }
  for (const a of db.pengaduan) for (const e of a.percakapan) terpakai.add(e.id)
  for (;;) {
    const id = `${awalan}_${Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0')}`
    if (!terpakai.has(id)) return id
  }
}

/** Pemilik NIK di seluruh data, termasuk mantan penduduk dan desa lain (NIK berlaku nasional). */
export function pemilikNik(db: DbDemo, nik: string, kecualiId?: string): Penduduk | undefined {
  return db.penduduk.find((p) => p.nik === nik && p.id !== kecualiId)
}

/** Pesan NIK ganda tanpa membuka nama warga desa lain. */
export function pesanNikGanda(pemilik: Penduduk, desaId: string): string {
  return pemilik.desaId === desaId ? `NIK sudah terdaftar atas nama ${pemilik.nama}` : 'NIK sudah terdaftar di desa lain'
}

/** Dusun bila RW dan RT-nya memang ada di wilayah desa. */
export function wilayahSah(dusun: readonly Dusun[], dusunId: string, rw: string, rt: string): Dusun | null {
  const d = dusun.find((x) => x.id === dusunId)
  return d && d.rw.some((w) => w.nomor === rw && w.rt.some((t) => t.nomor === rt)) ? d : null
}

/** Catat perubahan field ke Riwayat penduduk. Panggil di dalam ubahDb. */
export function catatRiwayat(db: DbDemo, p: Penduduk, perubahan: readonly Perubahan[], oleh: Pelaku, waktu: string): void {
  for (const u of perubahan) {
    db.riwayat.push({
      id: idBaru(db, 'rwy'), desaId: p.desaId, pendudukId: p.id, field: u.field, nilaiLama: u.nilaiLama, nilaiBaru: u.nilaiBaru, oleh, waktu,
    })
  }
}

/** Catat kejadian ke Buku hari ini (SPEC §5.3). Panggil di dalam ubahDb. */
export function catatAktivitas(db: DbDemo, a: Omit<Aktivitas, 'id'>): void {
  db.aktivitas.push({ ...a, id: idBaru(db, 'akt') })
}
