import { del, get, set } from 'idb-keyval'

export type Penyimpanan = {
  baca(kunci: string): Promise<unknown>
  tulis(kunci: string, nilai: unknown): Promise<void>
  hapus(kunci: string): Promise<void>
}

export const penyimpananIdb: Penyimpanan = {
  baca: (kunci) => get(kunci),
  tulis: (kunci, nilai) => set(kunci, nilai),
  hapus: (kunci) => del(kunci),
}

/** Untuk uji: penyimpanan di memori yang meniru salinan terstruktur IndexedDB. */
export function penyimpananMemori(): Penyimpanan & { isi: Map<string, unknown> } {
  const isi = new Map<string, unknown>()
  return {
    isi,
    baca: async (kunci) => structuredClone(isi.get(kunci)),
    tulis: async (kunci, nilai) => {
      isi.set(kunci, structuredClone(nilai))
    },
    hapus: async (kunci) => {
      isi.delete(kunci)
    },
  }
}
