import { CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiDanaDesaKabupaten } from '@/api/kabupaten'
import { keAlamat } from '@/app/alamat'
import { labelKabupaten } from '@/domain/alamat/alamat'
import { formatAngka, formatPersen } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { barisCsvDanaDesa, BATAS_TERTINGGAL_POIN, type DanaDesa, type JumlahDana } from '@/domain/kabupaten/dana-desa'
import { rasioApbdes } from '@/domain/kabupaten/pemantauan'
import { cn } from '@/ui/cn'
import { Rupiah } from '@/ui/domain/Rupiah'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { TenggatKabupaten } from './TenggatKabupaten'

const kepala = 'border-b border-garis px-3 py-2 text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2 tabular-nums'
const kanan = cn(sel, 'text-right whitespace-nowrap')
const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

const rasioJumlah = (j: JumlahDana): number | null => (j.anggaran > 0 ? j.realisasi / j.anggaran : null)
const teksPersen = (rasio: number | null) => (rasio === null ? '—' : formatPersen(rasio))

/** "Median realisasi desa 63,2%. 2 desa tertinggal, lebih dari 15 poin di bawah median." */
function kalimatDanaDesa(d: DanaDesa): string {
  if (d.medianRealisasi === null) return 'Belum ada desa yang punya APBDes tahun ini.'
  const median = `Median realisasi desa ${formatPersen(d.medianRealisasi)}.`
  return d.total.tertinggal === 0
    ? `${median} Tidak ada desa yang tertinggal.`
    : `${median} ${formatAngka(d.total.tertinggal)} desa tertinggal, lebih dari ${BATAS_TERTINGGAL_POIN} poin di bawah median.`
}

function SelUang({ anggaran, realisasi, rasio }: { anggaran: number; realisasi: number; rasio: number | null }) {
  return (
    <>
      <td className={kanan}>
        <Rupiah nilai={anggaran} ringkas />
      </td>
      <td className={kanan}>
        <Rupiah nilai={realisasi} ringkas />
      </td>
      <td className={kanan}>{teksPersen(rasio)}</td>
    </>
  )
}

/**
 * Dana Desa di dasbor kabupaten (SPEC-V0.2 §8.3 butir 4): pagu dan realisasi belanja APBDes per kecamatan yang bisa dibuka
 * per desa, desa tertinggal, dan Unduh CSV; di bawahnya tenggat laporan.
 */
export function DanaDesaKabupaten({ sekarang = new Date() }: { sekarang?: Date }) {
  const kueri = useQuery(opsiDanaDesaKabupaten())
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
    if (d) unduhBerkas(`dana-desa-${labelKabupaten(d.kabupaten.nama)}-${tanggalIsoWib(sekarang)}.csv`, keCsv(barisCsvDanaDesa(d)))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        judul="Dana Desa"
        meta={d && `Realisasi belanja APBDes ${d.tahun} · Kabupaten ${d.kabupaten.nama}`}
        aksi={
          <Tombol ikon={<DownloadSimple aria-hidden size={16} />} isDisabled={!d} onPress={unduh}>
            Unduh CSV
          </Tombol>
        }
      />
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !d ? (
        <BarisKerangka jumlah={8} label="Memuat Dana Desa…" />
      ) : d.kecamatan.length === 0 ? (
        <EmptyState judul="Belum ada desa pelanggan" keterangan="Kabupaten ini belum punya desa yang memakai Sinfodes." />
      ) : (
        <>
          <div className="flex max-w-3xl flex-col gap-2">
            <p className="font-serif text-judul-bagian">{kalimatDanaDesa(d)}</p>
            <p className="text-teks-kecil text-tinta-2">
              Angka ini realisasi belanja APBDes secara keseluruhan. Pemisahan per sumber dana (DD, ADD, PAD) menyusul bila data
              Siskeudes asli sudah tersedia.
            </p>
          </div>
          <div className="flex justify-end">
            <Tombol ukuran="kecil" onPress={() => setTerbuka(semuaTerbuka ? new Set() : new Set(d.kecamatan.map((k) => k.kecamatan.kode)))}>
              {semuaTerbuka ? 'Tutup semua desa' : 'Buka semua desa'}
            </Tombol>
          </div>
          <div className="overflow-x-auto border-y border-garis bg-lembar">
            <table className="w-full min-w-[44rem] border-collapse">
              <caption className="sr-only">{`Dana Desa Kabupaten ${d.kabupaten.nama} per kecamatan`}</caption>
              <thead>
                <tr>
                  <th scope="col" className={cn(kepala, 'text-left')}>
                    Kecamatan / desa
                  </th>
                  <th scope="col" className={cn(kepala, 'text-left')}>
                    Desa ber-APBDes
                  </th>
                  <th scope="col" className={cn(kepala, 'text-right')}>
                    Pagu
                  </th>
                  <th scope="col" className={cn(kepala, 'text-right')}>
                    Realisasi
                  </th>
                  <th scope="col" className={cn(kepala, 'text-right')}>
                    %
                  </th>
                </tr>
              </thead>
              {d.kecamatan.map((k) => {
                const buka = terbuka.has(k.kecamatan.kode)
                return (
                  <tbody key={k.kecamatan.kode} className="border-t border-garis">
                    <tr>
                      <th scope="row" className={cn(sel, 'text-left font-medium')}>
                        <Button
                          onPress={() => balik(k.kecamatan.kode)}
                          aria-expanded={buka}
                          className={cn('inline-flex items-center gap-1.5 rounded-1 text-left', fokus)}
                        >
                          <CaretRight aria-hidden size={14} className={cn('shrink-0 transition-transform', buka && 'rotate-90')} />
                          {k.kecamatan.nama}
                        </Button>
                      </th>
                      <td className={cn(sel, 'whitespace-nowrap')}>
                        {`${formatAngka(k.desaBerApbdes)} dari ${formatAngka(k.desa.length)} desa`}
                        {k.tertinggal > 0 && <span className="text-oker">{` · ${formatAngka(k.tertinggal)} tertinggal`}</span>}
                      </td>
                      <SelUang anggaran={k.anggaran} realisasi={k.realisasi} rasio={rasioJumlah(k)} />
                    </tr>
                    {buka &&
                      k.desa.map((x) => (
                        <tr key={x.id} className="text-teks-kecil">
                          <th scope="row" className={cn(sel, 'pl-9 text-left font-normal')}>
                            {/* Desa Persiapan belum punya website (SPEC-V0.2 §4.1). */}
                            {x.status === 'Persiapan' ? (
                              x.nama
                            ) : (
                              <Tautan href={keAlamat({ jenis: 'desa', label: x.alamat })} nada="tinta">
                                {x.nama}
                              </Tautan>
                            )}
                            {x.tertinggal && (
                              <span className="ml-2 border-l-2 border-oker pl-1.5 font-medium text-oker">Tertinggal</span>
                            )}
                          </th>
                          <td className={sel}>{x.status}</td>
                          {x.apbdes ? (
                            <SelUang anggaran={x.apbdes.anggaran} realisasi={x.apbdes.realisasi} rasio={rasioApbdes(x.apbdes)} />
                          ) : (
                            <td colSpan={3} className={cn(sel, 'text-right text-tinta-2')}>
                              Belum ada APBDes tahun ini
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                )
              })}
              <tfoot>
                <tr className="border-t-[1.5px] border-tinta font-medium">
                  <th scope="row" className={cn(sel, 'text-left')}>
                    {`Kabupaten ${d.kabupaten.nama}`}
                  </th>
                  <td className={cn(sel, 'whitespace-nowrap')}>{`${formatAngka(d.total.desaBerApbdes)} desa`}</td>
                  <SelUang anggaran={d.total.anggaran} realisasi={d.total.realisasi} rasio={rasioJumlah(d.total)} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="max-w-3xl text-teks-kecil text-tinta-2">
            {`Desa tertinggal: realisasinya lebih dari ${BATAS_TERTINGGAL_POIN} poin di bawah median desa di kabupaten ini. Persen kecamatan dan kabupaten dari jumlah realisasi dibagi jumlah pagu.`}
          </p>
        </>
      )}
      <TenggatKabupaten sekarang={sekarang} />
    </div>
  )
}
