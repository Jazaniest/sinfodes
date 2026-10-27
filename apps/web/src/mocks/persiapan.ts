import { LANGKAH_PERSIAPAN, type LangkahPersiapan, type Persiapan } from '@/domain/wilayah/persiapan'
import type { Desa } from '@/domain/wilayah/schema'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

/** Langkah persiapan desa (SPEC §5.3), dihitung dari data panelnya. Dipakai Beranda desa dan Konsol. */
export function persiapanDesa(db: DbDemo, desa: Desa): Persiapan {
  const selesai: Record<LangkahPersiapan, boolean> = {
    identitas: [desa.alamatKantor, desa.kodePos, desa.surel, desa.telepon].every((x) => x.trim() !== '') && desa.jamLayanan.length > 0,
    wilayah: db.dusun.some((d) => d.desaId === desa.id),
    impor: db.penduduk.some((p) => p.desaId === desa.id),
    pengguna: db.pengguna.filter((p) => p.desaId === desa.id).length > 1,
    'jenis-surat': db.jenisSurat.some((j) => j.desaId === desa.id && j.aktif),
  }
  return LANGKAH_PERSIAPAN.map((langkah) => ({ langkah, selesai: selesai[langkah] }))
}
