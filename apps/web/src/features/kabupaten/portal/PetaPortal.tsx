import { lazy, Suspense, useMemo, useState } from 'react'
import { keAlamat } from '@/app/alamat'
import { formatAngka } from '@/domain/format/angka'
import type { TitikPortal } from '@/domain/kabupaten/portal'
import { WARNA_TITIK, type TitikBerwarna } from '@/features/peta/gaya-titik-desa'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Banner } from '@/ui/umpan-balik/Banner'

// MapLibre hanya dimuat di portal kabupaten, jadi pustakanya tidak ikut JS awal alamat lain.
const PetaTitikDesa = lazy(() => import('@/features/peta/PetaTitikDesa'))

const KELOMPOK = [
  { id: 'bergabung', label: 'Sudah bergabung', warna: WARNA_TITIK.portal.bergabung },
  { id: 'persiapan', label: 'Dalam persiapan', warna: WARNA_TITIK.portal.persiapan },
] as const

/** ID titik: alamat desa bergabung, atau nama desa Persiapan (yang belum punya alamat). */
const idTitik = (d: TitikPortal) => d.label ?? `persiapan:${d.nama}`

/**
 * Peta desa di portal publik kabupaten (SPEC-V0.2 §8.2 [Usul]): titik hanya diwarnai menurut kelompok bergabung atau
 * Persiapan, tanpa Indeks atau angka lain, supaya tidak ada desa yang dipermalukan.
 */
export function PetaPortal({ peta }: { peta: readonly TitikPortal[] }) {
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const titik = useMemo<TitikBerwarna[]>(
    () => peta.map((d) => ({ id: idTitik(d), titik: d.titik, warna: WARNA_TITIK.portal[d.kelompok] })),
    [peta],
  )
  const pilihan = peta.find((d) => idTitik(d) === terpilih) ?? null
  return (
    <section aria-labelledby="judul-peta-desa" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="judul-peta-desa" className="font-serif text-judul-halaman font-medium">
          Peta desa
        </h2>
        <ul aria-label="Keterangan warna" className="flex flex-wrap gap-x-4 gap-y-1 text-teks-kecil">
          {KELOMPOK.map((k) => (
            <li key={k.id} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-penuh border border-kertas" style={{ backgroundColor: k.warna }} />
              {`${k.label} (${formatAngka(peta.filter((d) => d.kelompok === k.id).length)})`}
            </li>
          ))}
        </ul>
      </div>
      <div className="h-80 overflow-hidden rounded-2 border border-garis bg-kertas-2 sm:h-[28rem]">
        {gagal ? (
          <div className="flex h-full items-center p-4">
            <Banner nada="peringatan">Peta tidak bisa ditampilkan di perangkat ini. Daftar desa di bawah tetap bisa dibuka.</Banner>
          </div>
        ) : (
          <Suspense fallback={<p className="p-4 text-tinta-2">Memuat peta…</p>}>
            <PetaTitikDesa label="Peta desa kabupaten" titik={titik} terpilih={terpilih} onPilih={setTerpilih} onGagal={() => setGagal(true)} />
          </Suspense>
        )}
      </div>
      {pilihan ? (
        <section aria-label="Desa terpilih" className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-y border-garis bg-lembar px-4 py-3">
          <span>
            <span className="font-medium">{pilihan.nama}</span>
            <span className="text-tinta-2">{` · Kecamatan ${pilihan.kecamatan}`}</span>
          </span>
          {pilihan.label ? (
            <Tautan href={keAlamat({ jenis: 'desa', label: pilihan.label })}>{`Buka website ${pilihan.nama}`}</Tautan>
          ) : (
            <span className="text-teks-kecil text-tinta-2">Sedang bersiap memakai Sinfodes</span>
          )}
        </section>
      ) : (
        <p className="text-teks-kecil text-tinta-2">Pilih titik desa untuk membuka websitenya. Letak titik perkiraan.</p>
      )}
    </section>
  )
}
