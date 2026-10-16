import { DOMAIN_INDUK } from '@/app/alamat'
import { penyimpananIdb } from '../penyimpanan'
import { layaniPesanHub } from './layani'
import { adalahPesanKeHub, asalHubSah, type PesanDariHub } from './protokol'

/**
 * Isi `hub-demo.html` di alamat induk (SPEC-V0.2 §4.6): satu IndexedDB untuk semua subdomain demo. Setiap tab memasang
 * hub sendiri; setelah tulis atau hapus, hub lain diberi tahu lewat BroadcastChannel dan meneruskannya ke halamannya.
 */
const siaran = new BroadcastChannel('sinfodes-hub')

/** Asal halaman yang memasang hub ini, dari referrer; null bila bukan alamat Sinfodes. */
const asalPemasang = (() => {
  try {
    const asal = new URL(document.referrer).origin
    return asalHubSah(asal, DOMAIN_INDUK) ? asal : null
  } catch {
    return null
  }
})()

const kePemasang = (p: PesanDariHub) => {
  if (asalPemasang) window.parent.postMessage(p, asalPemasang)
}

window.addEventListener('message', (e: MessageEvent) => {
  if (!asalHubSah(e.origin, DOMAIN_INDUK) || !adalahPesanKeHub(e.data)) return
  const p = e.data
  const sumber = e.source as Window | null
  void layaniPesanHub(p, penyimpananIdb).then((balasan) => {
    sumber?.postMessage(balasan, e.origin)
    if (p.op !== 'baca' && balasan.galat === undefined) siaran.postMessage(p.kunci)
  })
})

siaran.onmessage = (e: MessageEvent) => {
  if (typeof e.data === 'string') kePemasang({ sinfodesHub: 1, jenis: 'berubah', kunci: e.data })
}

kePemasang({ sinfodesHub: 1, jenis: 'siap' })
