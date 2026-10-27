import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { LABEL_STATUS_KEGIATAN } from '@/domain/pembangunan/schema'
import type { BlokTampil } from '@/domain/publik/schema'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

// MapLibre hanya diunduh saat blok terlihat di layar, sehingga beranda tetap ringan (SPEC A13.4).
const PetaDesa = lazy(() => import('@/features/peta/PetaDesa'))
const SEMUA_LAPISAN = { dusun: true, fasilitas: true, kegiatan: true } as const

type Props = { blok: Extract<BlokTampil, { jenis: 'peta' }> }

/** Peta desa (SPEC-V0.2 11.4): batas dusun, fasilitas, dan kegiatan; `dengan-keterangan` menambah keterangan objek terpilih. */
export function BlokPeta({ blok }: Props) {
  const { lapisan } = blok.data
  const wadah = useRef<HTMLDivElement>(null)
  // Tanpa IntersectionObserver (mis. lingkungan uji), peta dianggap langsung terlihat.
  const [terlihat, setTerlihat] = useState(() => typeof IntersectionObserver === 'undefined')
  const [gagal, setGagal] = useState(false)
  const [terpilih, setTerpilih] = useState<{ jenis: 'fasilitas' | 'kegiatan' | 'dusun'; id: string } | null>(null)

  useEffect(() => {
    const el = wadah.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const pengamat = new IntersectionObserver(
      (entri) => {
        if (entri.some((e) => e.isIntersecting)) {
          setTerlihat(true)
          pengamat.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [])

  const keterangan = (() => {
    if (!terpilih) return null
    if (terpilih.jenis === 'fasilitas') {
      const f = lapisan.fasilitas.find((x) => x.id === terpilih.id)
      return f ? [f.nama, f.keterangan].filter(Boolean).join(' · ') : null
    }
    if (terpilih.jenis === 'kegiatan') {
      const k = lapisan.kegiatan.find((x) => x.id === terpilih.id)
      return k ? `${k.nama} · ${LABEL_STATUS_KEGIATAN[k.status]} ${k.progresFisik}%` : null
    }
    return null
  })()

  return (
    <WadahBlok blok={blok}>
      <Rubrik
        id={blok.id}
        judul="Peta desa"
        aksi={blok.varian === 'dengan-keterangan' ? <span className="text-teks-kecil text-tinta-2">{lapisan.fasilitas.length} fasilitas · {lapisan.kegiatan.length} kegiatan</span> : undefined}
      >
        <div ref={wadah} className="h-80 overflow-hidden rounded-2 border border-garis bg-kertas-2">
          {gagal ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-tinta-2">Peta desa</p>
            </div>
          ) : terlihat ? (
            <Suspense fallback={<p className="p-4 text-tinta-2">Memuat peta…</p>}>
              <PetaDesa lapisan={lapisan} tampil={SEMUA_LAPISAN} terpilih={terpilih} onPilih={setTerpilih} onGagal={() => setGagal(true)} />
            </Suspense>
          ) : null}
        </div>
        {blok.varian === 'dengan-keterangan' && (
          <p aria-live="polite" className="text-teks-kecil">
            {keterangan ?? <span className="text-tinta-2">Ketuk batas dusun, fasilitas, atau lokasi kegiatan untuk melihat namanya.</span>}
          </p>
        )}
      </Rubrik>
    </WadahBlok>
  )
}
