import { DownloadSimple } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKabupaten, opsiDetailSiaran, tarikSiaran } from '@/api/kabupaten'
import { formatAngka } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { formatJam, formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { bolehKabupaten } from '@/domain/kabupaten/hak-akses'
import {
  barisCsvSiaran, kalimatSasaran, KOLOM_CSV_SIARAN, labelStatusSiaran, lewatTenggatSiaran, type DetailSiaranKabupaten,
  type StatusSiaranDesa,
} from '@/domain/kabupaten/siaran'
import { cn } from '@/ui/cn'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKabupaten } from '../sesi-konteks'
import { IsiSiaran } from './IsiSiaran'

const JEJAK = [{ label: 'Siaran', href: '/kabupaten/admin/siaran' }]
const kepala = 'border-b border-garis px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2 align-top'
type Filter = 'semua' | StatusSiaranDesa

/** Warna status hanya pelengkap; labelnya selalu tertulis. */
const NADA_STATUS: Readonly<Record<StatusSiaranDesa, string>> = {
  'belum-dibaca': 'text-tinta-2',
  dibaca: 'text-tinta',
  ditindaklanjuti: 'text-hijau',
}

const waktuPendek = (iso: string) => `${formatTanggal(iso, 'pendek')} ${formatJam(iso)}`
const waktuPanjang = (iso: string) => `${formatTanggal(iso)} pukul ${formatJam(iso)}`

type Props = { id: string; sekarang?: Date }

/** Satu siaran dengan status per desa (SPEC-V0.2 §8.4 Di dasbor kabupaten), filter status, dan Unduh CSV. Admin bisa menariknya. */
export function DetailSiaran({ id, sekarang = new Date() }: Props) {
  const kueri = useQuery(opsiDetailSiaran(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat siaran…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <div className="flex flex-col items-start gap-3">
          <EmptyState judul="Siaran tidak ditemukan" keterangan="Periksa kembali tautannya, atau buka dari daftar siaran." />
          <Tautan href="/kabupaten/admin/siaran">Kembali ke daftar siaran</Tautan>
        </div>
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiDetail detail={kueri.data} sekarang={sekarang} />
}

function IsiDetail({ detail: d, sekarang }: { detail: DetailSiaranKabupaten; sekarang: Date }) {
  const { pengguna, kabupaten } = useSesiKabupaten()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('semua')
  const [tanya, setTanya] = useState(false)
  const s = d.siaran
  const hariIni = tanggalIsoWib(sekarang)
  const tarik = useMutation({
    mutationFn: () => tarikSiaran(s.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kunciKabupaten.siaran })
      tampilkanToast({ pesan: 'Siaran ditarik.', nada: 'berhasil' })
      setTanya(false)
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })
  const pilihan = [
    { id: 'semua', label: 'Semua' },
    { id: 'belum-dibaca', label: 'Belum dibaca' },
    { id: 'dibaca', label: 'Dibaca' },
    ...(s.tindakLanjut ? [{ id: 'ditindaklanjuti', label: 'Ditindaklanjuti' }] : []),
  ]
  const tampil = d.desa.filter((x) => filter === 'semua' || x.status === filter)
  const unduh = () =>
    unduhBerkas(
      `status-siaran-${kabupaten.label}-${s.id}.csv`,
      keCsv([[...KOLOM_CSV_SIARAN], ...d.desa.map((x) => barisCsvSiaran(x, s.tindakLanjut, hariIni))]),
    )
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={s.judul}
        meta={`Dikirim ${waktuPanjang(s.dikirimPada)} oleh ${s.dikirimOleh} · ${kalimatSasaran(s.sasaran)}`}
        aksi={
          <div className="flex flex-wrap gap-2">
            <Tombol ikon={<DownloadSimple aria-hidden size={16} />} onPress={unduh}>
              Unduh CSV
            </Tombol>
            {bolehKabupaten(pengguna.peran, 'kab.siaran') && !s.ditarik && (
              <Tombol varian="bahaya" onPress={() => setTanya(true)}>
                Tarik siaran
              </Tombol>
            )}
          </div>
        }
      />
      {s.ditarik && (
        <Banner>{`Ditarik ${waktuPanjang(s.ditarik.pada)} oleh ${s.ditarik.olehNama}. Desa hanya melihat keterangan "Ditarik oleh kabupaten".`}</Banner>
      )}
      <IsiSiaran isi={s.isi} lampiran={s.lampiran} />
      <p className="text-tinta-2">{s.tindakLanjut ? `Perlu tindak lanjut sampai ${formatTanggal(s.tindakLanjut.tenggat)}.` : 'Tanpa tindak lanjut.'}</p>
      <section aria-labelledby="judul-status-desa" className="flex flex-col gap-4">
        <h2 id="judul-status-desa" className="font-serif text-judul-bagian font-medium">
          {`${formatAngka(s.dibaca)} dari ${formatAngka(s.jumlahDesa)} desa sudah membaca` +
            (s.tindakLanjut ? ` · ${formatAngka(s.ditindaklanjuti)} sudah menindaklanjuti` : '')}
        </h2>
        <ChipFilter label="Saring status" pilihan={pilihan} nilai={filter} onUbah={(f) => setFilter(f as Filter)} />
        <div className="overflow-x-auto border-y border-garis bg-lembar">
          <table className="w-full min-w-[40rem] border-collapse">
            <caption className="sr-only">Status per desa</caption>
            <thead>
              <tr>
                {['Kecamatan', 'Desa', 'Status', 'Dibaca', 'Tindak lanjut'].map((k) => (
                  <th key={k} scope="col" className={kepala}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-garis">
              {tampil.map((x) => {
                const lewat = lewatTenggatSiaran(s.tindakLanjut, x.status, hariIni)
                return (
                  <tr key={x.id}>
                    <td className={cn(sel, 'text-tinta-2')}>{x.kecamatan}</td>
                    <th scope="row" className={cn(sel, 'text-left font-normal')}>
                      {x.nama}
                    </th>
                    <td className={cn(sel, lewat ? 'font-medium text-merah' : NADA_STATUS[x.status])}>{labelStatusSiaran(x.status, lewat)}</td>
                    <td className={cn(sel, 'whitespace-nowrap tabular-nums')}>{x.dibacaPada ? waktuPendek(x.dibacaPada) : '—'}</td>
                    <td className={sel}>
                      {x.tindakLanjut
                        ? `${formatTanggal(x.tindakLanjut.pada, 'pendek')}${x.tindakLanjut.catatan ? `: ${x.tindakLanjut.catatan}` : ''}`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {tampil.length === 0 && <p className="px-3 py-4 text-tinta-2">Tidak ada desa dengan status ini.</p>}
        </div>
      </section>
      <ConfirmDialog
        isOpen={tanya}
        onOpenChange={setTanya}
        judul="Tarik siaran ini?"
        labelSetuju="Tarik siaran"
        bahaya
        memuat={tarik.isPending}
        onSetuju={() => tarik.mutate()}
      >
        Desa tidak lagi melihat isi dan lampirannya; yang tampil hanya keterangan "Ditarik oleh kabupaten". Status baca tetap tercatat.
      </ConfirmDialog>
    </div>
  )
}
