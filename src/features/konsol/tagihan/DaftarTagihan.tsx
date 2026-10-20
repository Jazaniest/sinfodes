import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiCariTagihanKonsol, opsiDaftarTagihanKonsol } from '@/api/konsol'
import { formatRupiah } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { LABEL_TAB_TAGIHAN, TAB_TAGIHAN, type BarisTagihanKonsol, type TabTagihan } from '@/domain/langganan/tagihan'
import { CapTagihan } from '@/features/langganan/CapTagihan'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { useTunda } from '@/ui/hooks/useTunda'
import { SearchField } from '@/ui/isian/SearchField'
import { TabNav } from '@/ui/navigasi/TabNav'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

type Props = {
  /** Tab dari alamat halaman; undefined berarti server memilih (Menunggu verifikasi bila ada isinya). */
  tab: TabTagihan | undefined
  onBukaTagihan: (id: string) => void
  sekarang?: Date
}

const KOSONG: Readonly<Record<TabTagihan, string>> = {
  menunggu: 'Tidak ada bukti bayar yang menunggu verifikasi.',
  belum: 'Tidak ada tagihan yang belum dibayar.',
  lewat: 'Tidak ada tagihan yang lewat jatuh tempo.',
  lunas: 'Belum ada tagihan yang lunas.',
  semua: 'Belum ada tagihan.',
}

const hrefTab = (tab: TabTagihan): string => `/konsol/tagihan?tab=${tab}`

function kolomTagihan(hariIni: string): KolomTabel<BarisTagihanKonsol>[] {
  return [
    {
      id: 'desa',
      judul: 'Desa',
      wajib: true,
      isi: (t) => (
        <span className="flex flex-col">
          <span className="font-medium">{t.desa.nama}</span>
          <span className="text-teks-kecil text-tinta-2">{`${t.desa.kecamatan} · ${t.desa.kabupaten}`}</span>
        </span>
      ),
    },
    { id: 'nomor', judul: 'Nomor', isi: (t) => <span className="font-mono">{t.nomor}</span> },
    { id: 'periode', judul: 'Periode', isi: (t) => t.periode.label },
    { id: 'nominal', judul: 'Nominal', rataKanan: true, isi: (t) => <span className="tabular-nums">{formatRupiah(t.nominal)}</span> },
    { id: 'jatuh-tempo', judul: 'Jatuh tempo', isi: (t) => formatTanggal(t.jatuhTempo, 'pendek') },
    { id: 'status', judul: 'Status', isi: (t) => <CapTagihan tagihan={t} hariIni={hariIni} /> },
  ]
}

const barisRingkas = (t: BarisTagihanKonsol) => (
  <span className="flex flex-col gap-1">
    <span className="font-medium">{t.desa.nama}</span>
    <span className="text-teks-kecil text-tinta-2">{`${t.periode.label} · ${formatRupiah(t.nominal)}`}</span>
  </span>
)

/**
 * Daftar Tagihan di Konsol (SPEC-V0.2 §10.4): lima tab dengan angkanya, dan kotak cari nominal. Kata kunci hanya disimpan di
 * state: nominal dicari lintas tab (mencocokkan mutasi rekening), nomor atau nama desa dalam tab yang aktif.
 */
export function DaftarTagihan({ tab, onBukaTagihan, sekarang = new Date() }: Props) {
  const [halaman, setHalaman] = useState(1)
  const [kata, setKata] = useState('')
  const kataTunda = useTunda(kata.trim(), 250)
  const daftar = useQuery({ ...opsiDaftarTagihanKonsol(tab, halaman), placeholderData: keepPreviousData })
  const aktif = daftar.data?.tab ?? tab
  const hasil = useQuery(opsiCariTagihanKonsol(kataTunda, aktif))
  const hariIni = tanggalIsoWib(sekarang)
  const kolom = kolomTagihan(hariIni)
  const mencari = kata.trim() !== ''

  return (
    <div>
      <PageHeader
        judul="Tagihan"
        meta="Verifikasi bukti bayar desa pelanggan"
        tab={
          <TabNav
            label="Status tagihan"
            items={TAB_TAGIHAN.map((t) => ({
              label: LABEL_TAB_TAGIHAN[t],
              href: hrefTab(t),
              aktif: t === aktif,
              hitungan: daftar.data ? { nilai: daftar.data.jumlah[t], label: 'tagihan' } : undefined,
            }))}
          />
        }
      />
      <div className="py-4">
        <SearchField
          label="Cari nominal, nomor, atau desa"
          placeholder="Cari nominal, nomor, atau desa"
          value={kata}
          onChange={setKata}
          className="max-w-md"
        />
      </div>
      {mencari ? (
        <DataTable
          label="Hasil pencarian"
          kolom={kolom}
          kolomUtama="desa"
          baris={kataTunda === kata.trim() ? hasil.data?.data : undefined}
          memuat={kataTunda !== kata.trim() || hasil.isPending}
          galat={hasil.isError ? pesanGalat(hasil.error) : null}
          onCobaLagi={() => void hasil.refetch()}
          onBukaBaris={(t) => onBukaTagihan(t.id)}
          barisRingkas={barisRingkas}
          kosong={<EmptyState judul={`Tidak ada tagihan yang cocok dengan “${kata.trim()}”.`} keterangan="Coba nominal lengkap, nomor tagihan, atau nama desa." />}
        />
      ) : (
        <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            label="Daftar tagihan"
            kolom={kolom}
            kolomUtama="desa"
            baris={daftar.data?.data}
            memuat={daftar.isPending}
            galat={daftar.isError ? pesanGalat(daftar.error) : null}
            onCobaLagi={() => void daftar.refetch()}
            onBukaBaris={(t) => onBukaTagihan(t.id)}
            barisRingkas={barisRingkas}
            kosong={<EmptyState judul={KOSONG[aktif ?? 'menunggu']} />}
          />
          {daftar.data && daftar.data.meta.total > daftar.data.meta.pageSize && (
            <Pagination page={daftar.data.meta.page} pageSize={daftar.data.meta.pageSize} total={daftar.data.meta.total} onPage={setHalaman} />
          )}
        </div>
      )}
    </div>
  )
}
