import { CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiDataGabungan } from '@/api/kabupaten'
import { labelKabupaten } from '@/domain/alamat/alamat'
import { formatAngka } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { formatTanggal } from '@/domain/format/tanggal'
import { barisCsvGabungan, KOLOM_GABUNGAN, LABEL_KOLOM_GABUNGAN, type BarisGabungan } from '@/domain/kabupaten/data-gabungan'
import type { SelSamar } from '@/domain/kabupaten/samaran'
import { cn } from '@/ui/cn'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const kepala = 'border-b border-garis px-3 py-2 text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2 tabular-nums'
/** Kolom nama lengket di kiri supaya angka tetap terbaca saat tabel digulir mendatar di HP. */
const lengket = 'sticky left-0 z-10 bg-lembar'
const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

const GRUP = [
  { label: 'Penduduk', kolom: ['laki', 'perempuan', 'jiwa'] },
  { label: 'KK', kolom: ['kk'] },
  { label: 'Kelompok umur', kolom: ['u0_4', 'u5_14', 'u15_59', 'u60'] },
  { label: 'Penerima bansos (KK)', kolom: ['blt', 'pkh', 'pangan'] },
] as const

const teksSel = (s: SelSamar) => (typeof s === 'number' ? formatAngka(s) : s)

function SelBaris({ baris }: { baris: BarisGabungan | null }) {
  if (!baris) {
    return (
      <td colSpan={KOLOM_GABUNGAN.length} className={cn(sel, 'text-tinta-2')}>
        Belum ada data penduduk
      </td>
    )
  }
  return (
    <>
      {KOLOM_GABUNGAN.map((k) => (
        <td key={k} className={cn(sel, 'text-right whitespace-nowrap', typeof baris[k] === 'string' && 'text-tinta-2')}>
          {teksSel(baris[k])}
        </td>
      ))}
    </>
  )
}

/**
 * Data gabungan di dasbor kabupaten (SPEC-V0.2 §8.3 butir 6): penduduk, KK, kelompok umur, dan penerima bansos per kecamatan
 * yang bisa dibuka per desa. Angka sudah disamarkan di server; layar dan CSV menampilkan sel yang sama.
 */
export function DataGabungan() {
  const kueri = useQuery(opsiDataGabungan())
  const [terbuka, setTerbuka] = useState<ReadonlySet<string>>(new Set())
  const d = kueri.data
  const semuaTerbuka = d !== undefined && d.kecamatan.length > 0 && d.kecamatan.every((k) => terbuka.has(k.kecamatan.kode))
  const balik = (k: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama)
      if (baru.has(k)) baru.delete(k)
      else baru.add(k)
      return baru
    })
  const unduh = () => {
    if (d) unduhBerkas(`data-gabungan-${labelKabupaten(d.kabupaten.nama)}-${d.tanggal}.csv`, keCsv(barisCsvGabungan(d)))
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        judul="Data gabungan"
        meta={d && `Penduduk dan penerima bansos · Kabupaten ${d.kabupaten.nama} · ${formatTanggal(d.tanggal, 'hari')}`}
        aksi={
          <Tombol ikon={<DownloadSimple aria-hidden size={16} />} isDisabled={!d} onPress={unduh}>
            Unduh CSV
          </Tombol>
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-prose text-teks-kecil text-tinta-2">
          Angka 1-4 ditampilkan sebagai &lt;5. Tanda * berarti angka ikut disamarkan, supaya angka &lt;5 di baris atau kolom yang sama
          tidak bisa dihitung dari jumlahnya.
        </p>
        {d && d.kecamatan.length > 0 && (
          <Tombol ukuran="kecil" onPress={() => setTerbuka(semuaTerbuka ? new Set() : new Set(d.kecamatan.map((k) => k.kecamatan.kode)))}>
            {semuaTerbuka ? 'Tutup semua desa' : 'Buka semua desa'}
          </Tombol>
        )}
      </div>
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !d ? (
        <BarisKerangka jumlah={8} label="Memuat data gabungan…" />
      ) : d.kecamatan.length === 0 ? (
        <EmptyState judul="Belum ada desa pelanggan" keterangan="Kabupaten ini belum punya desa yang memakai Sinfodes." />
      ) : (
        <div className="overflow-x-auto border-y border-garis bg-lembar">
          <table className="w-full min-w-[64rem] border-collapse">
            <caption className="sr-only">{`Data gabungan Kabupaten ${d.kabupaten.nama} per kecamatan`}</caption>
            <thead>
              <tr>
                <th scope="col" rowSpan={2} className={cn(kepala, lengket, 'text-left align-bottom')}>
                  Kecamatan / desa
                </th>
                {GRUP.map((g) =>
                  g.kolom.length === 1 ? (
                    <th key={g.label} scope="col" rowSpan={2} className={cn(kepala, 'text-right align-bottom')}>
                      {g.label}
                    </th>
                  ) : (
                    <th key={g.label} scope="colgroup" colSpan={g.kolom.length} className={cn(kepala, 'border-l text-center')}>
                      {g.label}
                    </th>
                  ),
                )}
              </tr>
              <tr>
                {GRUP.filter((g) => g.kolom.length > 1).flatMap((g) =>
                  g.kolom.map((k) => (
                    <th key={k} scope="col" className={cn(kepala, 'text-right normal-case')}>
                      {LABEL_KOLOM_GABUNGAN[k]}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            {d.kecamatan.map((k) => {
              const buka = terbuka.has(k.kecamatan.kode)
              return (
                <tbody key={k.kecamatan.kode} className="border-t border-garis">
                  <tr>
                    <th scope="row" className={cn(sel, lengket, 'text-left font-medium')}>
                      <Button
                        onPress={() => balik(k.kecamatan.kode)}
                        aria-expanded={buka}
                        className={cn('inline-flex items-center gap-1.5 rounded-1 text-left whitespace-nowrap', fokus)}
                      >
                        <CaretRight aria-hidden size={14} className={cn('shrink-0 transition-transform', buka && 'rotate-90')} />
                        {k.kecamatan.nama}
                      </Button>
                    </th>
                    <SelBaris baris={k.baris} />
                  </tr>
                  {buka &&
                    k.desa.map((x) => (
                      <tr key={x.id} className="text-teks-kecil">
                        <th scope="row" className={cn(sel, lengket, 'pl-9 text-left font-normal whitespace-nowrap')}>
                          {x.nama}
                        </th>
                        <SelBaris baris={x.baris} />
                      </tr>
                    ))}
                </tbody>
              )
            })}
            <tfoot>
              <tr className="border-t-[1.5px] border-tinta font-medium">
                <th scope="row" className={cn(sel, lengket, 'text-left')}>
                  Jumlah kabupaten
                </th>
                <SelBaris baris={d.total} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
