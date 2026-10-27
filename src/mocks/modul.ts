import { MODUL_BAWAAN_DESA_BARU, type ModulDesa } from '@/domain/pengaturan/modul'
import { ambilDb } from './db'

/** Modul desa. Desa tanpa catatan dianggap belum menyalakan apa pun, sama dengan desa baru dari Konsol. */
export function modulDesaDi(desaId: string): ModulDesa {
  const m = ambilDb().modulDesa.find((x) => x.desaId === desaId)
  return m ? { kesehatan: m.kesehatan } : { ...MODUL_BAWAAN_DESA_BARU }
}
