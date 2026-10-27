/**
 * Pesan antara halaman dan hub penyimpanan demo (SPEC-V0.2 §4.6). Hub adalah iframe `hub-demo.html` di alamat induk yang
 * menyimpan basis data demo untuk semua subdomain; setiap alamat membaca dan menulis lewat `postMessage`.
 */
export type OpHub = 'baca' | 'tulis' | 'hapus'
export type PesanKeHub = { sinfodesHub: 1; id: number; op: OpHub; kunci: string; nilai?: unknown }
export type PesanDariHub =
  | { sinfodesHub: 1; jenis: 'siap' }
  | { sinfodesHub: 1; jenis: 'balasan'; id: number; nilai?: unknown; galat?: string }
  | { sinfodesHub: 1; jenis: 'berubah'; kunci: string }

const OP: readonly string[] = ['baca', 'tulis', 'hapus']
const JENIS: readonly string[] = ['siap', 'balasan', 'berubah']

const bertanda = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && (x as { sinfodesHub?: unknown }).sinfodesHub === 1

export function adalahPesanKeHub(x: unknown): x is PesanKeHub {
  return bertanda(x) && typeof x.id === 'number' && typeof x.op === 'string' && OP.includes(x.op) && typeof x.kunci === 'string'
}

export function adalahPesanDariHub(x: unknown): x is PesanDariHub {
  return bertanda(x) && typeof x.jenis === 'string' && JENIS.includes(x.jenis)
}

/** Asal yang boleh bicara dengan hub: http/https dengan host sama dengan induk atau subdomain langsung di bawahnya. */
export function asalHubSah(asal: string, domainInduk: string): boolean {
  let url: URL
  try {
    url = new URL(asal)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const induk = domainInduk.toLowerCase()
  return url.hostname === induk || url.hostname.endsWith(`.${induk}`)
}
