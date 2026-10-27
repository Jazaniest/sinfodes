import { randomUUID } from 'node:crypto'
import type { Db } from './basisdata/klien'
import { jejakAudit } from './basisdata/skema'

export type CatatanAudit = {
  desaId: string | null
  /** Contoh `masuk.berhasil`, `masuk.gagal`. */
  jenis: string
  /** ID pelaku, atau null bila belum ada pelaku (masuk gagal). */
  pelaku: string | null
  waktu: Date
  /** Ringkasan tanpa data pribadi: tidak boleh memuat NIK, email polos, kata sandi, atau token (SPEC-V0.3 §15.1). */
  ringkasan: Record<string, unknown>
}

/** Menambah satu baris jejak audit. Peran desa hanya boleh INSERT (tidak bisa membaca, mengubah, atau menghapus). */
export async function catatAudit(db: Db, c: CatatanAudit): Promise<void> {
  await db.insert(jejakAudit).values({ id: `aud_${randomUUID()}`, desaId: c.desaId, jenis: c.jenis, pelaku: c.pelaku, waktu: c.waktu, ringkasan: c.ringkasan })
}
