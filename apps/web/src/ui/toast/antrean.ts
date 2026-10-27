export type NadaToast = 'info' | 'berhasil' | 'galat'
export type Toast = { id: number; pesan: string; nada: NadaToast; aksi?: { label: string; onPress: () => void } }

const MAKS_TOAST = 3
let daftar: readonly Toast[] = []
let idBerikut = 1
const pendengar = new Set<() => void>()
const kabari = () => pendengar.forEach((p) => p())

export function tampilkanToast(isi: { pesan: string; nada?: NadaToast; aksi?: Toast['aksi'] }): number {
  const id = idBerikut++
  daftar = [...daftar, { id, pesan: isi.pesan, nada: isi.nada ?? 'info', aksi: isi.aksi }].slice(-MAKS_TOAST)
  kabari()
  return id
}

export function tutupToast(id: number): void {
  daftar = daftar.filter((t) => t.id !== id)
  kabari()
}

export function kosongkanToast(): void {
  daftar = []
  kabari()
}

/** Untuk useSyncExternalStore. */
export function dengarkanToast(p: () => void): () => void {
  pendengar.add(p)
  return () => {
    pendengar.delete(p)
  }
}

export function ambilDaftarToast(): readonly Toast[] {
  return daftar
}
