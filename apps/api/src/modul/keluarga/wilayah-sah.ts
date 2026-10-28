import type { Dusun } from '@sinfodes/kontrak/wilayah/schema'

/** Dusun bila RW dan RT-nya memang ada di wilayah desa, kalau tidak null. */
export function wilayahSah(dusun: readonly Dusun[], dusunId: string, rw: string, rt: string): Dusun | null {
  const d = dusun.find((x) => x.id === dusunId)
  return d && d.rw.some((w) => w.nomor === rw && w.rt.some((t) => t.nomor === rt)) ? d : null
}
