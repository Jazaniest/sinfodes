import type { Penyimpanan } from '../penyimpanan'
import type { PesanDariHub, PesanKeHub } from './protokol'

type Balasan = Extract<PesanDariHub, { jenis: 'balasan' }>

/** Jalankan satu permintaan di hub. Galat penyimpanan dikembalikan sebagai teks, bukan dilempar. */
export async function layaniPesanHub(p: PesanKeHub, penyimpanan: Penyimpanan): Promise<Balasan> {
  try {
    if (p.op === 'baca') return { sinfodesHub: 1, jenis: 'balasan', id: p.id, nilai: await penyimpanan.baca(p.kunci) }
    if (p.op === 'tulis') await penyimpanan.tulis(p.kunci, p.nilai)
    else await penyimpanan.hapus(p.kunci)
    return { sinfodesHub: 1, jenis: 'balasan', id: p.id }
  } catch (e) {
    return { sinfodesHub: 1, jenis: 'balasan', id: p.id, galat: e instanceof Error ? e.message : String(e) }
  }
}
