import { Paperclip, Plus } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { opsiSuratMasuk } from '@/api/arsip'
import { pesanGalat } from '@/api/galat'
import { formatAngka } from '@/domain/format/angka'
import { daftarBulanTerakhir, formatBulan, formatTanggal } from '@/domain/format/tanggal'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { FilterSuratMasuk, SuratMasuk } from '@/domain/surat/arsip'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Select } from '@/ui/isian/Select'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { TabSurat } from '../TabSurat'
import { DialogSuratMasuk } from './DialogSuratMasuk'
import { LaciSuratMasuk } from './LaciSuratMasuk'
import { TabArsip } from './TabArsip'

type Props = { filter: FilterSuratMasuk; onUbahFilter: (ubah: Partial<FilterSuratMasuk>) => void; sekarang?: Date }

const agenda = (n: number) => String(n).padStart(3, '0')
const strip = <span className="text-tinta-2">—</span>

/** Register surat masuk per bulan (SPEC §7.4 layar 5), urut nomor agenda. */
export function DaftarSuratMasuk({ filter, onUbahFilter, sekarang }: Props) {
  const { pengguna } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const bulanPilihan = useMemo(() => daftarBulanTerakhir(hariIni, 12), [hariIni])
  const bulan = filter.bulan ?? bulanPilihan[0]
  const daftar = useQuery({ ...opsiSuratMasuk({ ...filter, bulan }), placeholderData: keepPreviousData })
  const [mencatat, setMencatat] = useState(false)
  const [terpilih, setTerpilih] = useState<SuratMasuk | null>(null)
  const bolehCatat = boleh(pengguna.peran, 'surat.proses')
  const total = daftar.data?.meta.total

  const kolom = useMemo(
    (): KolomTabel<SuratMasuk>[] => [
      { id: 'agenda', judul: 'No. agenda', wajib: true, isi: (s) => <span className="font-mono">{agenda(s.noAgenda)}</span> },
      { id: 'diterima', judul: 'Diterima', isi: (s) => <span className="whitespace-nowrap">{formatTanggal(s.diterima, 'pendek')}</span> },
      {
        id: 'surat',
        judul: 'Nomor dan tanggal surat',
        isi: (s) => (
          <span className="flex flex-col">
            <span className="font-mono text-teks-kecil">{s.nomor}</span>
            <span className="text-teks-kecil text-tinta-2">{formatTanggal(s.tanggalSurat, 'pendek')}</span>
          </span>
        ),
      },
      { id: 'pengirim', judul: 'Pengirim', isi: (s) => <span className="font-medium">{s.pengirim}</span> },
      { id: 'perihal', judul: 'Perihal', isi: (s) => s.perihal },
      { id: 'disposisi', judul: 'Disposisi', isi: (s) => s.disposisi?.kepada ?? strip },
      {
        id: 'scan',
        judul: 'Scan',
        isi: (s) =>
          s.scan ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip aria-hidden size={14} />
              Ada
            </span>
          ) : (
            strip
          ),
      },
    ],
    [],
  )

  const kosong =
    (total ?? 0) > 0 ? (
      <EmptyState judul={`Halaman ${formatAngka(filter.page)} tidak ada`} aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>} />
    ) : (
      <EmptyState
        judul={`Belum ada surat masuk di ${formatBulan(bulan)}`}
        keterangan={bolehCatat ? 'Catat setiap surat yang diterima kantor desa supaya masuk register.' : undefined}
      />
    )
  const meta =
    total !== undefined ? `${formatBulan(bulan)} · ${formatAngka(total)} surat masuk` : daftar.isError ? null : <Skeleton className="h-4 w-56 max-w-full" />

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Layanan Surat', href: '/admin/surat' }]}
        judul="Arsip surat"
        meta={meta}
        aksi={
          bolehCatat && (
            <Tombol varian="utama" ikon={<Plus aria-hidden size={16} />} onPress={() => setMencatat(true)}>
              Catat surat masuk
            </Tombol>
          )
        }
        tab={<TabSurat aktif="arsip" />}
      />
      <div className="pt-4">
        <TabArsip aktif="masuk" />
      </div>
      <div className="flex flex-wrap items-end gap-3 py-4">
        <Select
          label="Bulan"
          pilihan={bulanPilihan.map((b) => ({ id: b, label: formatBulan(b) }))}
          nilai={bulan}
          onUbah={(id) => onUbahFilter({ bulan: id && id !== bulanPilihan[0] ? id : undefined, page: 1 })}
          className="w-48"
        />
      </div>
      <div aria-busy={daftar.isPlaceholderData} className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <DataTable
          label="Arsip surat masuk"
          kolom={kolom}
          kolomUtama="pengirim"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={kosong}
          onBukaBaris={setTerpilih}
          barisRingkas={(s) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{s.pengirim}</span>
              <span>{s.perihal}</span>
              <span className="text-teks-kecil text-tinta-2">
                No. {agenda(s.noAgenda)} · diterima {formatTanggal(s.diterima, 'pendek')}
              </span>
            </span>
          )}
        />
      </div>
      {daftar.data && daftar.data.meta.total > 0 && !daftar.isError && (
        <Pagination
          page={filter.page}
          pageSize={filter.pageSize}
          total={daftar.data.meta.total}
          onPage={(page) => onUbahFilter({ page })}
          onPageSize={(pageSize) => onUbahFilter({ pageSize, page: 1 })}
        />
      )}
      <LaciSuratMasuk surat={terpilih} onTutup={() => setTerpilih(null)} />
      {mencatat && <DialogSuratMasuk hariIni={hariIni} onTutup={() => setMencatat(false)} onTersimpan={() => setMencatat(false)} />}
    </div>
  )
}
