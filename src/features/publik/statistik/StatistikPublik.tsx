import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiStatistikPublik } from '@/api/publik-halaman'
import { formatAngka, formatPersen } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { GRAFIK_PUBLIK, type BatangPublik, type StatistikPublik as DataStatistik } from '@/domain/publik/statistik'
import { JUDUL_GRAFIK } from '@/domain/statistik/penduduk'
import { BarChart } from '@/ui/grafik/BarChart'
import { PyramidChart } from '@/ui/grafik/PyramidChart'
import { Checkbox } from '@/ui/isian/Checkbox'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { Rubrik } from '@/ui/website/Rubrik'
import { usePublik } from '../publik-konteks'

const sel = 'border-b border-garis py-1.5'
const kepala = 'border-b border-garis py-1.5 text-label font-medium text-tinta-2 uppercase'
const angka = 'border-b border-garis py-1.5 text-right font-mono tabular-nums'

function TabelBatang({ judul, batang, jiwa }: { judul: string; batang: readonly BatangPublik[]; jiwa: number }) {
  return (
    <table className="w-full">
      <caption className="sr-only">{judul}</caption>
      <thead>
        <tr>
          <th scope="col" className={`${kepala} text-left`}>
            Kategori
          </th>
          <th scope="col" className={`${kepala} text-right`}>
            Jiwa
          </th>
          <th scope="col" className={`${kepala} text-right`}>
            Persen
          </th>
        </tr>
      </thead>
      <tbody>
        {batang.map((b) => (
          <tr key={b.label}>
            <th scope="row" className={`${sel} text-left font-normal`}>
              {b.label}
            </th>
            <td className={angka}>{formatAngka(b.jumlah)}</td>
            <td className={angka}>{formatPersen(jiwa > 0 ? b.jumlah / jiwa : 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelPiramida({ s }: { s: DataStatistik }) {
  return (
    <table className="w-full max-w-xl">
      <caption className="sr-only">Piramida penduduk</caption>
      <thead>
        <tr>
          <th scope="col" className={`${kepala} text-left`}>
            Kelompok umur
          </th>
          <th scope="col" className={`${kepala} text-right`}>
            Laki-laki
          </th>
          <th scope="col" className={`${kepala} text-right`}>
            Perempuan
          </th>
          <th scope="col" className={`${kepala} text-right`}>
            Jumlah
          </th>
        </tr>
      </thead>
      <tbody>
        {s.piramida.map((k) => (
          <tr key={k.label}>
            <th scope="row" className={`${sel} text-left font-mono font-normal tabular-nums`}>
              {k.label}
            </th>
            <td className={angka}>{formatAngka(k.laki)}</td>
            <td className={angka}>{formatAngka(k.perempuan)}</td>
            <td className={angka}>{formatAngka(k.laki + k.perempuan)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function IsiStatistik({ s }: { s: DataStatistik }) {
  const [tabel, setTabel] = useState(false)
  if (s.jiwa === 0) return <EmptyState judul="Belum ada data penduduk" keterangan="Desa belum mencatat penduduk di buku induk." />
  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-judul-bagian">
          {formatAngka(s.jiwa)} jiwa · {formatAngka(s.laki)} laki-laki · {formatAngka(s.perempuan)} perempuan · {formatAngka(s.kk)} keluarga
        </p>
        <p className="text-teks-kecil text-tinta-2">Keadaan {formatTanggal(s.tanggal)}</p>
      </div>
      <Checkbox isSelected={tabel} onChange={setTabel} className="self-start">
        Lihat sebagai tabel
      </Checkbox>
      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-2">
        <Rubrik id="piramida" judul="Piramida penduduk" className="lg:col-span-2">
          {tabel ? (
            <TabelPiramida s={s} />
          ) : (
            <PyramidChart
              label="Piramida penduduk"
              baris={s.piramida.map((k) => ({ id: k.label, label: k.label, laki: k.laki, perempuan: k.perempuan, hrefLaki: null, hrefPerempuan: null }))}
            />
          )}
        </Rubrik>
        {GRAFIK_PUBLIK.filter((g) => s[g].length > 0).map((g) => (
          <Rubrik key={g} id={`grafik-${g}`} judul={JUDUL_GRAFIK[g]}>
            {tabel ? (
              <TabelBatang judul={JUDUL_GRAFIK[g]} batang={s[g]} jiwa={s.jiwa} />
            ) : (
              <BarChart label={JUDUL_GRAFIK[g]} batang={s[g].map((b) => ({ id: b.label, label: b.label, nilai: b.jumlah, href: null }))} />
            )}
          </Rubrik>
        ))}
      </div>
    </>
  )
}

/** Statistik penduduk (SPEC §9): angka yang sama dengan panel admin, hanya agregat, dengan pilihan tampilan tabel. */
export function StatistikPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiStatistikPublik(identitas.slug))
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">Statistik penduduk</h1>
        <p className="max-w-[56ch] text-tinta-2">
          Angka gabungan dari buku induk penduduk desa. Halaman ini tidak memuat data perorangan.
        </p>
      </div>
      {kueri.isPending && <BarisKerangka jumlah={8} label="Menghitung statistik…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && <IsiStatistik s={kueri.data} />}
    </div>
  )
}
