import { lazy, Suspense, useState } from 'react'
import { LABEL_STATUS_KEGIATAN } from '@/domain/pembangunan/schema'
import type { LapisanPeta, ObjekPeta } from '@/domain/peta/schema'
import type { ProfilPublik } from '@/domain/publik/profil'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

// MapLibre hanya dimuat di Profil, jadi pustakanya tidak ikut JS awal halaman website lain (SPEC §13.4).
const PetaDesa = lazy(() => import('@/features/peta/PetaDesa'))
const SEMUA_LAPISAN = { dusun: true, fasilitas: true, kegiatan: true } as const

type Props = { lapisan: LapisanPeta; wilayah: ProfilPublik['wilayah']; istilah: ProfilPublik['istilah'] }

/** Keterangan objek terpilih untuk pengunjung: nama, dusun, dan keterangan singkatnya; null bila belum ada pilihan. */
function keteranganObjek({ lapisan, wilayah, istilah }: Props, o: ObjekPeta | null): string | null {
  if (!o) return null
  const dusun = (id: string) => wilayah.find((w) => w.id === id)?.nama
  if (o.jenis === 'fasilitas') {
    const f = lapisan.fasilitas.find((x) => x.id === o.id)
    return f ? [f.nama, dusun(f.dusunId), f.keterangan].filter(Boolean).join(' · ') : null
  }
  if (o.jenis === 'kegiatan') {
    const k = lapisan.kegiatan.find((x) => x.id === o.id)
    return k ? [k.nama, `${LABEL_STATUS_KEGIATAN[k.status]} ${k.progresFisik}%`, dusun(k.dusunId)].filter(Boolean).join(' · ') : null
  }
  const w = wilayah.find((x) => x.id === o.id)
  return w ? `${w.nama} · ${w.rw} ${istilah.rw} · ${w.rt} ${istilah.rt}` : null
}

/**
 * Peta desa di Profil (SPEC §9): batas dusun, fasilitas umum, dan lokasi kegiatan pembangunan. Keterangan objek terpilih
 * ditulis di bawah peta; daftar fasilitas umum menjadi jalan lain bila peta tidak bisa dipakai.
 */
export function PetaProfil(props: Props) {
  const [terpilih, setTerpilih] = useState<ObjekPeta | null>(null)
  const [gagal, setGagal] = useState(false)
  const keterangan = keteranganObjek(props, terpilih)
  return (
    <div className="flex flex-col gap-3">
      <div className="h-80 overflow-hidden rounded-2 border border-garis bg-kertas-2 sm:h-[28rem]">
        {gagal ? (
          <div className="flex h-full items-center p-4">
            <Banner nada="peringatan">Peta tidak bisa ditampilkan di perangkat ini. Daftar fasilitas umum di bawah tetap bisa dipilih.</Banner>
          </div>
        ) : (
          <Suspense fallback={<p className="p-4 text-tinta-2">Memuat peta…</p>}>
            <PetaDesa lapisan={props.lapisan} tampil={SEMUA_LAPISAN} terpilih={terpilih} onPilih={setTerpilih} onGagal={() => setGagal(true)} />
          </Suspense>
        )}
      </div>
      <p aria-live="polite" className="text-teks-kecil">
        {keterangan ?? <span className="text-tinta-2">Ketuk batas dusun, fasilitas, atau lokasi kegiatan di peta untuk melihat namanya.</span>}
      </p>
      <section aria-labelledby="judul-fasilitas-umum" className="flex flex-col gap-1">
        <h3 id="judul-fasilitas-umum" className="text-label font-semibold tracking-wide uppercase">
          Fasilitas umum
        </h3>
        <ul className="grid sm:grid-cols-2">
          {props.lapisan.fasilitas.map((f) => (
            <li key={f.id}>
              <Tombol
                varian="teks"
                aria-pressed={terpilih?.jenis === 'fasilitas' && terpilih.id === f.id}
                onPress={() => setTerpilih({ jenis: 'fasilitas', id: f.id })}
              >
                {f.nama}
              </Tombol>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
