import { expect, it } from 'vitest'
import { penyimpananMemori, type Penyimpanan } from '../penyimpanan'
import { buatKlienHub, type SaluranHub } from './klien'
import { layaniPesanHub } from './layani'
import type { PesanDariHub } from './protokol'

/**
 * Tiruan beberapa tab yang berbagi satu hub: setiap saluran meneruskan pesan ke `layaniPesanHub` dengan penyimpanan
 * bersama, membalas ke pendengarnya sendiri, dan memberi tahu saluran lain setelah tulis atau hapus berhasil.
 */
function grupHub(penyimpanan: Penyimpanan) {
  const pendengar: Array<Set<(p: PesanDariHub) => void>> = []
  const saluran = (): SaluranHub => {
    const milik = new Set<(p: PesanDariHub) => void>()
    pendengar.push(milik)
    return {
      kirim: (p) => {
        void layaniPesanHub(p, penyimpanan).then((balasan) => {
          for (const cb of milik) cb(balasan)
          if (p.op !== 'baca' && !balasan.galat) {
            for (const lain of pendengar) if (lain !== milik) for (const cb of lain) cb({ sinfodesHub: 1, jenis: 'berubah', kunci: p.kunci })
          }
        })
      },
      dengar: (cb) => {
        milik.add(cb)
        return () => milik.delete(cb)
      },
    }
  }
  return { saluran }
}

it('dua tab membaca dan menulis data yang sama lewat hub; hanya tab lain yang diberi tahu (SPEC-V0.2 §4.6)', async () => {
  const grup = grupHub(penyimpananMemori())
  const a = buatKlienHub(grup.saluran())
  const b = buatKlienHub(grup.saluran())
  const berubahDiA: string[] = []
  const berubahDiB: string[] = []
  a.padaBerubah((k) => berubahDiA.push(k))
  b.padaBerubah((k) => berubahDiB.push(k))

  await a.tulis('sinfodes.demo.db', { isi: 1 })
  expect(await b.baca('sinfodes.demo.db')).toEqual({ isi: 1 })
  expect(berubahDiB).toEqual(['sinfodes.demo.db'])
  expect(berubahDiA).toEqual([])

  await b.hapus('sinfodes.demo.db')
  expect(await a.baca('sinfodes.demo.db')).toBeUndefined()
  expect(berubahDiA).toEqual(['sinfodes.demo.db'])
})

it('galat penyimpanan di hub sampai ke pemanggil sebagai penolakan', async () => {
  const rusak: Penyimpanan = {
    baca: () => Promise.reject(new Error('IndexedDB penuh')),
    tulis: () => Promise.reject(new Error('IndexedDB penuh')),
    hapus: () => Promise.reject(new Error('IndexedDB penuh')),
  }
  const klien = buatKlienHub(grupHub(rusak).saluran())
  await expect(klien.tulis('k', 1)).rejects.toThrow('IndexedDB penuh')
})
