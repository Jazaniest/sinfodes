import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import { LAPISAN_PETA, type JenisLapisan, type LapisanPeta, type ObjekPeta } from '@/domain/peta/schema'
import { gayaPeta, ID_LAPISAN, LAPISAN_KLIK, saringId } from './gaya-peta'

// maplibre-gl 6 mencari worker-nya relatif terhadap modulnya sendiri; setelah dibundel Vite alamat itu tidak ada lagi.
maplibregl.setWorkerUrl(urlWorker)

export type PropsPetaDesa = {
  lapisan: LapisanPeta
  tampil: Readonly<Record<JenisLapisan, boolean>>
  terpilih: ObjekPeta | null
  onPilih: (o: ObjekPeta) => void
  onGagal: () => void
}

/** Visibilitas lapisan dan sorotan objek terpilih. */
function terapkan(map: maplibregl.Map, tampil: PropsPetaDesa['tampil'], terpilih: ObjekPeta | null) {
  for (const jenis of LAPISAN_PETA) {
    for (const id of ID_LAPISAN[jenis]) map.setLayoutProperty(id, 'visibility', tampil[jenis] ? 'visible' : 'none')
    map.setFilter(`${jenis}-terpilih`, saringId(terpilih?.jenis === jenis ? terpilih.id : ''))
  }
}

/** Peta MapLibre (SPEC §8). Dimuat lewat React.lazy hanya di halaman Peta, jadi pustakanya tidak ikut di halaman lain. */
export default function PetaDesa({ lapisan, tampil, terpilih, onPilih, onGagal }: PropsPetaDesa) {
  const wadah = useRef<HTMLDivElement>(null)
  const peta = useRef<maplibregl.Map | null>(null)
  // Nilai terbaru untuk penangan peristiwa MapLibre, tanpa membuat ulang petanya.
  const terbaru = useRef({ tampil, terpilih, onPilih, onGagal })
  useEffect(() => {
    terbaru.current = { tampil, terpilih, onPilih, onGagal }
  })

  useEffect(() => {
    if (!wadah.current) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({ container: wadah.current, style: gayaPeta(lapisan), center: lapisan.pusat, zoom: lapisan.zoom, attributionControl: { compact: true } })
    } catch {
      terbaru.current.onGagal()
      return
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    for (const [id, jenis] of Object.entries(LAPISAN_KLIK)) {
      map.on('click', id, (e) => {
        const fid = e.features?.[0]?.properties?.id
        if (typeof fid === 'string') terbaru.current.onPilih({ jenis, id: fid })
      })
      map.on('mouseenter', id, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', id, () => {
        map.getCanvas().style.cursor = ''
      })
    }
    map.on('load', () => terapkan(map, terbaru.current.tampil, terbaru.current.terpilih))
    // Tile yang gagal dimuat tidak mematikan peta; hanya WebGL yang tidak tersedia.
    map.on('error', (e) => {
      if (/webgl/i.test(String(e.error?.message))) terbaru.current.onGagal()
    })
    peta.current = map
    return () => {
      map.remove()
      peta.current = null
    }
  }, [lapisan])

  useEffect(() => {
    const map = peta.current
    if (map?.isStyleLoaded()) terapkan(map, tampil, terpilih)
  }, [tampil, terpilih])

  useEffect(() => {
    const map = peta.current
    if (!map || !terpilih || terpilih.jenis === 'dusun') return
    const titik = (terpilih.jenis === 'fasilitas' ? lapisan.fasilitas : lapisan.kegiatan).find((x) => x.id === terpilih.id)?.titik
    if (titik) map.easeTo({ center: titik, zoom: Math.max(map.getZoom(), 14.5) })
  }, [terpilih, lapisan])

  return <div ref={wadah} role="region" aria-label="Peta desa" className="h-full w-full" />
}
