import { DownloadSimple } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { hapusTenggat, kunciKabupaten, opsiDetailTenggat } from '@/api/kabupaten'
import { labelKabupaten } from '@/domain/alamat/alamat'
import { formatAngka } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { bolehKabupaten } from '@/domain/kabupaten/hak-akses'
import { barisCsvTenggat, kalimatKirim, kalimatSisa, LABEL_STATUS_KIRIM, sisaHari, type DetailTenggat as Detail, type StatusKirim } from '@/domain/kabupaten/tenggat'
import { cn } from '@/ui/cn'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKabupaten } from '../sesi-konteks'
import { DialogTenggat } from './DialogTenggat'

const JEJAK = [{ label: 'Dana Desa', href: '/kabupaten/admin/dana-desa' }]
const kepala = 'border-b border-garis px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2'

const FILTER = [
  { id: 'semua', label: 'Semua' },
  { id: 'belum', label: 'Belum dikirim' },
  { id: 'lewat', label: 'Lewat tenggat' },
  { id: 'sudah', label: 'Sudah dikirim' },
] as const
type Filter = (typeof FILTER)[number]['id']

const cocok = (f: Filter, s: StatusKirim): boolean =>
  f === 'semua' || (f === 'sudah' ? s === 'dikirim' || s === 'terlambat' : s === f)

/** Warna status hanya pelengkap; labelnya selalu tertulis. */
const NADA_STATUS: Readonly<Record<StatusKirim, string>> = {
  dikirim: 'text-tinta',
  terlambat: 'text-oker',
  belum: 'text-tinta-2',
  lewat: 'font-medium text-merah',
}

type Props = { id: string; sekarang?: Date; onDihapus: () => void }

/** Status satu tenggat per desa sasaran (SPEC-V0.2 §8.3 butir 4), dengan filter status dan Unduh CSV. Admin bisa mengubah dan menghapus. */
export function DetailTenggat({ id, sekarang = new Date(), onDihapus }: Props) {
  const kueri = useQuery(opsiDetailTenggat(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat tenggat…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <div className="flex flex-col items-start gap-3">
          <EmptyState judul="Tenggat tidak ditemukan" keterangan="Tenggat ini mungkin sudah dihapus." />
          <Tautan href="/kabupaten/admin/dana-desa">Kembali ke Dana Desa</Tautan>
        </div>
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiDetail detail={kueri.data} sekarang={sekarang} onDihapus={onDihapus} />
}

function IsiDetail({ detail: d, sekarang, onDihapus }: { detail: Detail; sekarang: Date; onDihapus: () => void }) {
  const { pengguna, kabupaten } = useSesiKabupaten()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('semua')
  const [dialog, setDialog] = useState<'ubah' | 'hapus' | null>(null)
  const bolehAtur = bolehKabupaten(pengguna.peran, 'kab.tenggat')
  const t = d.tenggat
  const hapus = useMutation({
    mutationFn: () => hapusTenggat(t.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kunciKabupaten.tenggat })
      tampilkanToast({ pesan: 'Tenggat dihapus.', nada: 'berhasil' })
      setDialog(null)
      onDihapus()
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })
  const tampil = d.desa.filter((x) => cocok(filter, x.status))
  const unduh = () => unduhBerkas(`tenggat-${labelKabupaten(kabupaten.nama)}-${t.tanggal}.csv`, keCsv(barisCsvTenggat(d)))
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={t.nama}
        meta={`Tenggat ${formatTanggal(t.tanggal)} · ${kalimatSisa(sisaHari(t.tanggal, tanggalIsoWib(sekarang)))}`}
        aksi={
          <div className="flex flex-wrap gap-2">
            <Tombol ikon={<DownloadSimple aria-hidden size={16} />} onPress={unduh}>
              Unduh CSV
            </Tombol>
            {bolehAtur && (
              <>
                <Tombol onPress={() => setDialog('ubah')}>Ubah</Tombol>
                <Tombol varian="bahaya" onPress={() => setDialog('hapus')}>
                  Hapus
                </Tombol>
              </>
            )}
          </div>
        }
      />
      <p className="font-serif text-judul-bagian">{`${kalimatKirim(t)}.`}</p>
      <ChipFilter label="Saring status" pilihan={FILTER} nilai={filter} onUbah={(f) => setFilter(f as Filter)} />
      <div className="overflow-x-auto border-y border-garis bg-lembar">
        <table className="w-full min-w-[36rem] border-collapse">
          <caption className="sr-only">Status laporan per desa</caption>
          <thead>
            <tr>
              <th scope="col" className={kepala}>
                Kecamatan
              </th>
              <th scope="col" className={kepala}>
                Desa
              </th>
              <th scope="col" className={kepala}>
                Status
              </th>
              <th scope="col" className={kepala}>
                Tanggal kirim
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {tampil.map((x) => (
              <tr key={x.id}>
                <td className={cn(sel, 'text-tinta-2')}>{x.kecamatan}</td>
                <th scope="row" className={cn(sel, 'text-left font-normal')}>
                  {x.nama}
                </th>
                <td className={cn(sel, NADA_STATUS[x.status])}>{LABEL_STATUS_KIRIM[x.status]}</td>
                <td className={cn(sel, 'tabular-nums')}>{x.tanggalKirim ? formatTanggal(x.tanggalKirim) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tampil.length === 0 && <p className="px-3 py-4 text-tinta-2">Tidak ada desa dengan status ini.</p>}
      </div>
      {dialog === 'ubah' && (
        <DialogTenggat
          awal={t}
          onTutup={() => setDialog(null)}
          onBerhasil={() => void queryClient.invalidateQueries({ queryKey: kunciKabupaten.tenggat })}
        />
      )}
      <ConfirmDialog
        isOpen={dialog === 'hapus'}
        onOpenChange={(buka) => setDialog(buka ? 'hapus' : null)}
        judul={`Hapus tenggat "${t.nama}"?`}
        labelSetuju="Hapus tenggat"
        bahaya
        memuat={hapus.isPending}
        onSetuju={() => hapus.mutate()}
      >
        {t.dikirim > 0
          ? `${formatAngka(t.dikirim)} desa sudah menandai terkirim; tandanya ikut terhapus, dan pengingat di panel desa hilang.`
          : 'Pengingat di panel desa ikut hilang.'}
      </ConfirmDialog>
    </div>
  )
}
