import { adalahPesanDariHub, type PesanDariHub } from './protokol'
import type { SaluranHub } from './klien'

/**
 * Buka hub di iframe tersembunyi `<asalInduk>/hub-demo.html` dan tunggu tanda siap. Bila tidak siap dalam `batasMs`,
 * iframe dibuang dan hasilnya null; pemanggil memakai penyimpanan per alamat (SPEC-V0.2 §4.6).
 */
export function bukaSaluranHub(asalInduk: string, batasMs = 3000): Promise<SaluranHub | null> {
  const iframe = document.createElement('iframe')
  iframe.src = `${asalInduk}/hub-demo.html`
  iframe.hidden = true
  iframe.tabIndex = -1
  iframe.title = 'Penyimpanan demo'
  iframe.setAttribute('aria-hidden', 'true')
  const pendengar = new Set<(p: PesanDariHub) => void>()
  const terima = (e: MessageEvent) => {
    if (e.origin !== asalInduk || e.source !== iframe.contentWindow || !adalahPesanDariHub(e.data)) return
    for (const cb of pendengar) cb(e.data)
  }
  window.addEventListener('message', terima)
  document.body.append(iframe)
  return new Promise((selesai) => {
    const batas = setTimeout(() => {
      pendengar.delete(siap)
      window.removeEventListener('message', terima)
      iframe.remove()
      selesai(null)
    }, batasMs)
    function siap(p: PesanDariHub) {
      if (p.jenis !== 'siap') return
      clearTimeout(batas)
      pendengar.delete(siap)
      selesai({
        kirim: (pesan) => iframe.contentWindow?.postMessage(pesan, asalInduk),
        dengar: (cb) => {
          pendengar.add(cb)
          return () => pendengar.delete(cb)
        },
      })
    }
    pendengar.add(siap)
  })
}
