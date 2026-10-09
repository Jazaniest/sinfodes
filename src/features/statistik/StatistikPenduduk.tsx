import { DownloadSimple } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiStatistikPenduduk } from '@/api/statistik'
import { formatAngka, formatPersen } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import {
  barisCsvStatistik, filterBatang, filterKelompokUmur, GRAFIK_BATANG, JUDUL_GRAFIK, type Batang, type GrafikBatang,
  type StatistikPenduduk as Statistik,
} from '@/domain/statistik/penduduk'
import { namaDusun } from '@/domain/wilayah/alamat'
import { cn } from '@/ui/cn'
import { BarChart } from '@/ui/grafik/BarChart'
import { PyramidChart } from '@/ui/grafik/PyramidChart'
import { Checkbox } from '@/ui/isian/Checkbox'
import { Select } from '@/ui/isian/Select'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka, Skeleton } from '@/ui/umpan-balik/Skeleton'
import { unduhBerkas } from '@/ui/unduh'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { hrefDaftarPenduduk } from '../penduduk/filter-url'
import { TabKependudukan } from '../penduduk/TabKependudukan'

const SEMUA = 'semua'

type Props = { dusun: number | null; onUbahDusun: (dusun: number | null) => void; sekarang?: Date }

const hrefBatang = (g: GrafikBatang, b: Batang, dusun: number | null) =>
  b.kunci === null ? null : hrefDaftarPenduduk(filterBatang(g, b.kunci, dusun))

/** Statistik penduduk (SPEC §6.7): grafik atau tabel, tiap batang membuka daftar penduduk yang sudah terfilter. */
export function StatistikPenduduk({ dusun, onUbahDusun, sekarang }: Props) {
  const { pengguna, desa, dusun: daftarDusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const kadus = pengguna.peran === 'kadus'
  const kueri = useQuery({ ...opsiStatistikPenduduk(kadus ? null : dusun), placeholderData: keepPreviousData })
  const [tabel, setTabel] = useState(false)
  const istilah = desa.istilahWilayah
  const s = kueri.data
  const dusunAktif = s && s.dusun !== null ? daftarDusun.find((d) => d.nomor === s.dusun) : undefined
  const cakupan = dusunAktif ? `${namaDusun(dusunAktif, istilah)}, Desa ${desa.nama}` : `Desa ${desa.nama}`
  const judulGrafik = (g: GrafikBatang) => (g === 'perDusun' ? `Jumlah per ${istilah.dusun.toLowerCase()}` : JUDUL_GRAFIK[g])

  const unduh = (data: Statistik) => {
    const akhiran = dusunAktif ? `-dusun-${dusunAktif.nomor}` : ''
    unduhBerkas(`statistik-penduduk-${desa.slug}${akhiran}-${tanggalIsoWib(hariIni)}.csv`, keCsv(barisCsvStatistik(data, cakupan)))
  }

  const meta = s ? (
    `${formatAngka(s.jiwa)} jiwa · ${formatAngka(s.laki)} laki-laki · ${formatAngka(s.perempuan)} perempuan · ${formatAngka(s.kk)} KK` +
    (dusunAktif ? ` · ${namaDusun(dusunAktif, istilah)}` : '')
  ) : kueri.isError ? null : (
    <Skeleton className="h-4 w-80 max-w-full" />
  )

  let isi: ReactNode
  if (kueri.isPending) isi = <BarisKerangka jumlah={8} label="Menghitung statistik…" />
  else if (kueri.isError) isi = <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  else if (kueri.data.jiwa === 0) {
    isi = <EmptyState judul="Belum ada penduduk" keterangan={`Belum ada penduduk hidup yang tercatat di ${cakupan}.`} />
  } else {
    const data = kueri.data
    isi = (
      <div
        aria-busy={kueri.isPlaceholderData}
        className={cn('grid gap-x-10 gap-y-8 lg:grid-cols-2', kueri.isPlaceholderData && 'opacity-60 transition-opacity')}
      >
        <Bagian id="piramida" judul="Piramida penduduk" lebar>
          {tabel ? (
            <TabelPiramida data={data} />
          ) : (
            <PyramidChart
              label="Piramida penduduk"
              baris={data.piramida.map((k) => ({
                id: k.label, label: k.label, laki: k.laki, perempuan: k.perempuan,
                hrefLaki: hrefDaftarPenduduk(filterKelompokUmur(k, 'L', data.dusun)),
                hrefPerempuan: hrefDaftarPenduduk(filterKelompokUmur(k, 'P', data.dusun)),
              }))}
            />
          )}
        </Bagian>
        {GRAFIK_BATANG.filter((g) => data[g].length > 0).map((g) => (
          <Bagian key={g} id={g} judul={judulGrafik(g)}>
            {tabel ? (
              <TabelBatang judul={judulGrafik(g)} batang={data[g]} jiwa={data.jiwa} href={(b) => hrefBatang(g, b, data.dusun)} />
            ) : (
              <BarChart
                label={judulGrafik(g)}
                batang={data[g].map((b) => ({ id: b.label, label: b.label, nilai: b.jumlah, href: hrefBatang(g, b, data.dusun) }))}
              />
            )}
          </Bagian>
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Kependudukan' }]}
        judul="Statistik"
        meta={meta}
        aksi={
          s && s.jiwa > 0 && (
            <Tombol ikon={<DownloadSimple aria-hidden size={16} />} onPress={() => unduh(s)}>
              Unduh CSV
            </Tombol>
          )
        }
        tab={<TabKependudukan aktif="statistik" />}
      />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 py-4">
        {!kadus && (
          <Select
            label={istilah.dusun}
            className="w-64"
            pilihan={[
              { id: SEMUA, label: `Semua ${istilah.dusun.toLowerCase()}` },
              ...daftarDusun.map((d) => ({ id: String(d.nomor), label: namaDusun(d, istilah) })),
            ]}
            nilai={dusun === null ? SEMUA : String(dusun)}
            onUbah={(id) => onUbahDusun(id === null || id === SEMUA ? null : Number(id))}
          />
        )}
        <Checkbox isSelected={tabel} onChange={setTabel}>
          Lihat sebagai tabel
        </Checkbox>
      </div>
      {isi}
    </div>
  )
}

function Bagian({ id, judul, lebar, children }: { id: string; judul: string; lebar?: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={`judul-${id}`} className={cn('flex flex-col gap-3', lebar && 'lg:col-span-2')}>
      <h2 id={`judul-${id}`} className="border-b border-garis pb-1 text-label font-medium text-tinta-2 uppercase">
        {judul}
      </h2>
      {children}
    </section>
  )
}

const sel = 'border-b border-garis py-1.5'

function TabelBatang(props: { judul: string; batang: readonly Batang[]; jiwa: number; href: (b: Batang) => string | null }) {
  return (
    <table className="w-full text-teks">
      <caption className="sr-only">{props.judul}</caption>
      <thead>
        <tr className="text-left text-label text-tinta-2 uppercase">
          <th scope="col" className={cn(sel, 'font-medium')}>Kategori</th>
          <th scope="col" className={cn(sel, 'text-right font-medium')}>Jiwa</th>
          <th scope="col" className={cn(sel, 'text-right font-medium')}>Persen</th>
        </tr>
      </thead>
      <tbody>
        {props.batang.map((b) => {
          const tujuan = props.href(b)
          return (
            <tr key={b.label}>
              <th scope="row" className={cn(sel, 'text-left font-normal')}>
                {tujuan ? <Tautan href={tujuan} nada="tinta">{b.label}</Tautan> : b.label}
              </th>
              <td className={cn(sel, 'text-right font-mono tabular-nums')}>{formatAngka(b.jumlah)}</td>
              <td className={cn(sel, 'text-right font-mono tabular-nums')}>{formatPersen(b.jumlah / props.jiwa)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function TabelPiramida({ data }: { data: Statistik }) {
  return (
    <table className="w-full max-w-xl text-teks">
      <caption className="sr-only">Piramida penduduk</caption>
      <thead>
        <tr className="text-left text-label text-tinta-2 uppercase">
          <th scope="col" className={cn(sel, 'font-medium')}>Kelompok umur</th>
          <th scope="col" className={cn(sel, 'text-right font-medium')}>Laki-laki</th>
          <th scope="col" className={cn(sel, 'text-right font-medium')}>Perempuan</th>
          <th scope="col" className={cn(sel, 'text-right font-medium')}>Jumlah</th>
        </tr>
      </thead>
      <tbody>
        {data.piramida.map((k) => (
          <tr key={k.label}>
            <th scope="row" className={cn(sel, 'text-left font-mono font-normal tabular-nums')}>{k.label}</th>
            <td className={cn(sel, 'text-right font-mono tabular-nums')}>
              <Tautan href={hrefDaftarPenduduk(filterKelompokUmur(k, 'L', data.dusun))} nada="tinta">{formatAngka(k.laki)}</Tautan>
            </td>
            <td className={cn(sel, 'text-right font-mono tabular-nums')}>
              <Tautan href={hrefDaftarPenduduk(filterKelompokUmur(k, 'P', data.dusun))} nada="tinta">{formatAngka(k.perempuan)}</Tautan>
            </td>
            <td className={cn(sel, 'text-right font-mono tabular-nums')}>{formatAngka(k.laki + k.perempuan)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
