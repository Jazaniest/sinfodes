import { NotePencil } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarSiaran } from '@/api/kabupaten'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { bolehKabupaten } from '@/domain/kabupaten/hak-akses'
import { kalimatSasaran } from '@/domain/kabupaten/siaran'
import { Cap } from '@/ui/cap/Cap'
import { cn } from '@/ui/cn'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKabupaten } from '../sesi-konteks'

const kepala = 'border-b border-garis px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2 align-top'
const KOLOM = ['Judul', 'Dikirim', 'Sasaran', 'Dibaca', 'Ditindaklanjuti'] as const

/** Siaran ke desa (SPEC-V0.2 §8.4): semua siaran kabupaten ini, terbaru dulu. Admin bisa menulis siaran baru. */
export function DaftarSiaran() {
  const { pengguna } = useSesiKabupaten()
  const kueri = useQuery(opsiDaftarSiaran())
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        judul="Siaran ke desa"
        meta="Siaran tidak bisa diubah setelah terkirim, tetapi bisa ditarik."
        aksi={
          bolehKabupaten(pengguna.peran, 'kab.siaran') && (
            <TautanTombol href="/kabupaten/admin/siaran/tulis" varian="utama" ikon={<NotePencil aria-hidden size={16} />}>
              Tulis siaran
            </TautanTombol>
          )
        }
      />
      {kueri.isPending ? (
        <BarisKerangka jumlah={4} label="Memuat siaran…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : kueri.data.data.length === 0 ? (
        <EmptyState judul="Belum ada siaran" keterangan="Siaran yang dikirim ke desa tampil di sini beserta status bacanya." />
      ) : (
        <div className="overflow-x-auto border-y border-garis bg-lembar">
          <table className="w-full min-w-[44rem] border-collapse">
            <caption className="sr-only">Siaran</caption>
            <thead>
              <tr>
                {KOLOM.map((k) => (
                  <th key={k} scope="col" className={kepala}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-garis">
              {kueri.data.data.map((s) => (
                <tr key={s.id} className={cn(s.ditarik && 'text-tinta-2')}>
                  <td className={sel}>
                    <span className="flex flex-wrap items-center gap-2">
                      <Tautan href={`/kabupaten/admin/siaran/${s.id}`} nada="tinta" className="font-medium">
                        {s.judul}
                      </Tautan>
                      {s.ditarik && <Cap varian="nonaktif" label="Ditarik" />}
                    </span>
                  </td>
                  <td className={cn(sel, 'whitespace-nowrap tabular-nums')}>{formatTanggal(s.dikirimPada, 'pendek')}</td>
                  <td className={sel}>{kalimatSasaran(s.sasaran)}</td>
                  <td className={cn(sel, 'whitespace-nowrap tabular-nums')}>{`${formatAngka(s.dibaca)} dari ${formatAngka(s.jumlahDesa)}`}</td>
                  <td className={cn(sel, 'whitespace-nowrap tabular-nums')}>
                    {s.tindakLanjut ? `${formatAngka(s.ditindaklanjuti)} dari ${formatAngka(s.jumlahDesa)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
