import type { Penyimpanan } from '../penyimpanan'
import type { OpHub, PesanDariHub, PesanKeHub } from './protokol'

/** Jalur pesan ke satu hub; di browser berupa iframe (`iframe.ts`), di uji berupa tiruan. */
export type SaluranHub = { kirim(p: PesanKeHub): void; dengar(cb: (p: PesanDariHub) => void): () => void }

export type KlienHub = Penyimpanan & { padaBerubah(cb: (kunci: string) => void): () => void }

/** `Penyimpanan` yang membaca dan menulis lewat hub, ditambah pemberitahuan perubahan dari tab lain. */
export function buatKlienHub(saluran: SaluranHub): KlienHub {
  let nomor = 0
  const menunggu = new Map<number, { ok: (nilai: unknown) => void; gagal: (e: Error) => void }>()
  const pendengarBerubah = new Set<(kunci: string) => void>()
  saluran.dengar((p) => {
    if (p.jenis === 'berubah') for (const cb of pendengarBerubah) cb(p.kunci)
    if (p.jenis !== 'balasan') return
    const janji = menunggu.get(p.id)
    if (!janji) return
    menunggu.delete(p.id)
    if (p.galat !== undefined) janji.gagal(new Error(p.galat))
    else janji.ok(p.nilai)
  })
  const minta = (op: OpHub, kunci: string, nilai?: unknown) =>
    new Promise<unknown>((ok, gagal) => {
      const id = ++nomor
      menunggu.set(id, { ok, gagal })
      saluran.kirim(op === 'tulis' ? { sinfodesHub: 1, id, op, kunci, nilai } : { sinfodesHub: 1, id, op, kunci })
    })
  return {
    baca: (kunci) => minta('baca', kunci),
    tulis: async (kunci, nilai) => {
      await minta('tulis', kunci, nilai)
    },
    hapus: async (kunci) => {
      await minta('hapus', kunci)
    },
    padaBerubah: (cb) => {
      pendengarBerubah.add(cb)
      return () => pendengarBerubah.delete(cb)
    },
  }
}
