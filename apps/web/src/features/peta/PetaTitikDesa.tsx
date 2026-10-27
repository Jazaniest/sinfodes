import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import { saringId } from './gaya-peta'
import { batasTitik, fiturTitik, gayaTitikDesa, type TitikBerwarna } from './gaya-titik-desa'

// maplibre-gl 6 mencari worker-nya relatif terhadap modulnya sendiri; setelah dibundel Vite alamat itu tidak ada lagi.
maplibregl.setWorkerUrl(urlWorker)

export type PropsPetaTitikDesa = {
  titik: readonly TitikBerwarna[]
  terpilih: string | null
  onPilih: (id: string) => void
  onGagal: () => void
  /** Nama wilayah peta untuk pembaca layar, mis. "Peta Kabupaten Pelalawan". */
  label: string
}

/**
 * Peta titik desa kabupaten (SPEC-V0.2 §8.2, §8.3 butir 5). Dimuat lewat React.lazy hanya di layar Peta dan portal, jadi
 * pustakanya tidak ikut JS awal. Warna titik diganti tanpa membuat ulang petanya.
 */
export default function PetaTitikDesa({ titik, terpilih, onPilih, onGagal, label }: PropsPetaTitikDesa) {
  const wadah = useRef<HTMLDivElement>(null)
  const peta = useRef<maplibregl.Map | null>(null)
  const terbaru = useRef({ titik, terpilih, onPilih, onGagal })
  useEffect(() => {
    terbaru.current = { titik, terpilih, onPilih, onGagal }
  })

  useEffect(() => {
    if (!wadah.current) return
    const awal = terbaru.current.titik
    let map: maplibregl.Map
    try {
      const batas = batasTitik(awal)
      map = new maplibregl.Map({
        container: wadah.current,
        style: gayaTitikDesa(awal),
        ...(batas ? { bounds: batas, fitBoundsOptions: { padding: 40, maxZoom: 11 } } : { center: [101.9, 0.3], zoom: 8 }),
        attributionControl: { compact: true },
      })
    } catch {
      terbaru.current.onGagal()
      return
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', 'titik', (e) => {
      const id = e.features?.[0]?.properties?.id
      if (typeof id === 'string') terbaru.current.onPilih(id)
    })
    map.on('mouseenter', 'titik', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'titik', () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('load', () => map.setFilter('titik-terpilih', saringId(terbaru.current.terpilih ?? '')))
    // Tile yang gagal dimuat tidak mematikan peta; hanya WebGL yang tidak tersedia.
    map.on('error', (e) => {
      if (/webgl/i.test(String(e.error?.message))) terbaru.current.onGagal()
    })
    peta.current = map
    return () => {
      map.remove()
      peta.current = null
    }
  }, [])

  useEffect(() => {
    const map = peta.current
    if (!map?.isStyleLoaded()) return
    const sumber = map.getSource('titik')
    if (sumber instanceof maplibregl.GeoJSONSource) sumber.setData(fiturTitik(titik))
  }, [titik])

  useEffect(() => {
    const map = peta.current
    if (!map) return
    if (map.isStyleLoaded()) map.setFilter('titik-terpilih', saringId(terpilih ?? ''))
    // Hanya saat pilihan berganti; berganti lapisan tidak menggeser peta.
    const t = terbaru.current.titik.find((x) => x.id === terpilih)?.titik
    if (t) map.easeTo({ center: t, zoom: Math.max(map.getZoom(), 10) })
  }, [terpilih])

  return <div ref={wadah} role="region" aria-label={label} className="h-full w-full" />
}
