import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Button } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiPetaKabupaten } from '@/api/kabupaten'
import { formatAngka, formatPersen } from '@/domain/format/angka'
import { rasioApbdes } from '@/domain/kabupaten/pemantauan'
import {
  kelasRealisasi, KELAS_REALISASI, LABEL_KELAS_REALISASI, LABEL_LAPISAN_PETA_KABUPATEN, LAPISAN_PETA_KABUPATEN,
  type LapisanPetaKabupaten, type PetaKabupaten as DataPeta, type TitikPetaKabupaten,
} from '@/domain/kabupaten/peta'
import type { StatusDesa } from '@/domain/wilayah/schema'
import { WARNA_TITIK, type TitikBerwarna } from '@/features/peta/gaya-titik-desa'
import { cn } from '@/ui/cn'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KartuDesaPeta } from './KartuDesaPeta'

// MapLibre hanya dimuat di layar Peta, jadi pustakanya tidak ikut JS awal dasbor.
const PetaTitikDesa = lazy(() => import('@/features/peta/PetaTitikDesa'))

const kepala = 'border-b border-garis px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2'
const fokus =
  'rounded-1 text-left underline-offset-4 outline-none hover:underline data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

type Kelas = { id: string; label: string; warna: string }

/** Urutan legenda status: bergabung dulu, lalu yang belum atau sudah berhenti. */
const URUTAN_STATUS: readonly StatusDesa[] = ['Aktif', 'Uji coba', 'Persiapan', 'Ditangguhkan']

/** Kelas warna per lapisan, beserta kelas tiap desa. */
function kelasLapisan(lapisan: LapisanPetaKabupaten, d: DataPeta): { kelas: Kelas[]; kelasDesa: (x: TitikPetaKabupaten) => string } {
  if (lapisan === 'status') {
    return { kelas: URUTAN_STATUS.map((s) => ({ id: s, label: s, warna: WARNA_TITIK.status[s] })), kelasDesa: (x) => x.status }
  }
  return {
    kelas: KELAS_REALISASI.map((k) => ({ id: k, label: LABEL_KELAS_REALISASI[k], warna: WARNA_TITIK.realisasi[k] })),
    kelasDesa: (x) => kelasRealisasi(rasioApbdes(x.apbdes), d.medianRealisasi),
  }
}

/**
 * Peta di dasbor kabupaten (SPEC-V0.2 §8.3 butir 5): titik desa diwarnai menurut lapisan yang dipilih, kartu desa untuk titik
 * terpilih, dan daftar desa sebagai jalan lain bila peta tidak bisa dipakai. Lapisan tingkatan Indeks menyusul di 7C.
 */
export function PetaKabupaten() {
  const kueri = useQuery(opsiPetaKabupaten())
  const [lapisan, setLapisan] = useState<LapisanPetaKabupaten>('status')
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const d = kueri.data
  const warna = useMemo(() => {
    if (!d) return null
    const { kelas, kelasDesa } = kelasLapisan(lapisan, d)
    const peta = new Map(kelas.map((k) => [k.id, k.warna]))
    const titik: TitikBerwarna[] = d.desa.map((x) => ({ id: x.id, titik: x.titik, warna: peta.get(kelasDesa(x)) ?? WARNA_TITIK.status.Ditangguhkan }))
    const jumlah = (id: string) => d.desa.filter((x) => kelasDesa(x) === id).length
    return { kelas: kelas.map((k) => ({ ...k, jumlah: jumlah(k.id) })), titik, kelasDesa }
  }, [d, lapisan])
  const desaTerpilih = d?.desa.find((x) => x.id === terpilih) ?? null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader judul="Peta" meta={d && `Kabupaten ${d.kabupaten.nama} · ${formatAngka(d.desa.length)} desa`} />
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !d || !warna ? (
        <BarisKerangka jumlah={6} label="Memuat peta…" />
      ) : d.desa.length === 0 ? (
        <EmptyState judul="Belum ada desa di peta" keterangan="Kabupaten ini belum punya desa yang memakai Sinfodes." />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <RadioGroup
              label="Lapisan"
              pilihan={LAPISAN_PETA_KABUPATEN.map((l) => ({ id: l, label: LABEL_LAPISAN_PETA_KABUPATEN[l] }))}
              nilai={lapisan}
              onUbah={(v) => setLapisan(v as LapisanPetaKabupaten)}
            />
            <ul aria-label="Keterangan warna" className="flex flex-wrap gap-x-4 gap-y-1 text-teks-kecil">
              {warna.kelas.map((k) => (
                <li key={k.id} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-3 rounded-penuh border border-kertas" style={{ backgroundColor: k.warna }} />
                  {`${k.label} (${formatAngka(k.jumlah)})`}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="h-80 overflow-hidden rounded-2 border border-garis bg-kertas-2 sm:h-[28rem]">
              {gagal ? (
                <div className="flex h-full items-center p-4">
                  <Banner nada="peringatan">Peta tidak bisa ditampilkan di perangkat ini. Daftar desa di bawah tetap bisa dipakai.</Banner>
                </div>
              ) : (
                <Suspense fallback={<p className="p-4 text-tinta-2">Memuat peta…</p>}>
                  <PetaTitikDesa
                    label={`Peta Kabupaten ${d.kabupaten.nama}`}
                    titik={warna.titik}
                    terpilih={terpilih}
                    onPilih={setTerpilih}
                    onGagal={() => setGagal(true)}
                  />
                </Suspense>
              )}
            </div>
            {desaTerpilih ? (
              <KartuDesaPeta desa={desaTerpilih} />
            ) : (
              <p className="border border-dashed border-garis p-4 text-teks-kecil text-tinta-2">Pilih titik atau nama desa untuk melihat kartunya.</p>
            )}
          </div>
          <p className="text-teks-kecil text-tinta-2">
            Letak titik perkiraan di sekitar pusat kecamatan, kecuali desa yang sudah menggambar Peta Desa.
            {d.tanpaTitik > 0 && ` ${formatAngka(d.tanpaTitik)} desa belum punya titik di peta.`}
          </p>
          <div className="overflow-x-auto border-y border-garis bg-lembar">
            <table className="w-full min-w-[36rem] border-collapse">
              <caption className="sr-only">Daftar desa di peta</caption>
              <thead>
                <tr>
                  <th scope="col" className={kepala}>
                    Kecamatan
                  </th>
                  <th scope="col" className={kepala}>
                    Desa
                  </th>
                  <th scope="col" className={kepala}>
                    {LABEL_LAPISAN_PETA_KABUPATEN[lapisan]}
                  </th>
                  <th scope="col" className={cn(kepala, 'text-right')}>
                    Realisasi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {d.desa.map((x) => {
                  const kelas = warna.kelas.find((k) => k.id === warna.kelasDesa(x))
                  const rasio = rasioApbdes(x.apbdes)
                  return (
                    <tr key={x.id} className={cn(x.id === terpilih && 'bg-biru-muda')}>
                      <td className={cn(sel, 'text-tinta-2')}>{x.kecamatan}</td>
                      <th scope="row" className={cn(sel, 'font-normal')}>
                        <Button onPress={() => setTerpilih(x.id)} className={fokus}>
                          {x.nama}
                        </Button>
                      </th>
                      <td className={sel}>
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden className="size-2.5 rounded-penuh" style={{ backgroundColor: kelas?.warna }} />
                          {kelas?.label}
                        </span>
                      </td>
                      <td className={cn(sel, 'text-right tabular-nums')}>{rasio === null ? '—' : formatPersen(rasio)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
