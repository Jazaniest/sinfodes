import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciDetailSiaranDesa, kunciSiaranDesa, opsiDetailSiaranDesa, tandaiSiaranDibaca } from '@/api/siaran'
import { useBoleh } from '@/features/admin/useBoleh'
import { formatJam, formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { lewatTenggatSiaran, type DetailSiaranDesa as Detail } from '@/domain/kabupaten/siaran'
import { IsiSiaran } from '@/features/kabupaten/siaran/IsiSiaran'
import { cn } from '@/ui/cn'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { DialogTindakLanjut } from './DialogTindakLanjut'

const JEJAK = [{ label: 'Siaran kabupaten', href: '/admin/siaran' }]
const waktu = (iso: string) => `${formatTanggal(iso)} pukul ${formatJam(iso)}`

type Props = { id: string; sekarang?: Date }

/**
 * Satu siaran kabupaten di panel desa (SPEC-V0.2 §8.4). Membuka halaman ini menandai siaran dibaca untuk desa (sekali, lewat
 * POST, jadi pramuat tautan tidak ikut menandai). Kades atau Sekdes menandai tindak lanjut.
 */
export function DetailSiaranDesa({ id, sekarang = new Date() }: Props) {
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiDetailSiaranDesa(id))
  const ditandai = useRef<string | null>(null)
  const { mutate: tandaiBaca } = useMutation({
    mutationFn: () => tandaiSiaranDibaca(id),
    onSuccess: (hasil) => {
      queryClient.setQueryData(kunciDetailSiaranDesa(id), hasil)
      void queryClient.invalidateQueries({ queryKey: kunciSiaranDesa, exact: true })
    },
  })
  const perluDitandai = kueri.data !== undefined && kueri.data.dibaca === null && kueri.data.ditarik === null
  useEffect(() => {
    if (!perluDitandai || ditandai.current === id) return
    ditandai.current = id
    tandaiBaca()
  }, [perluDitandai, id, tandaiBaca])

  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat siaran…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <div className="flex flex-col items-start gap-3">
          <EmptyState judul="Siaran tidak ditemukan" keterangan="Siaran ini tidak dikirim ke desa Anda." />
          <Tautan href="/admin/siaran">Kembali ke Siaran kabupaten</Tautan>
        </div>
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiDetail s={kueri.data} hariIni={tanggalIsoWib(sekarang)} />
}

function IsiDetail({ s, hariIni }: { s: Detail; hariIni: string }) {
  const boleh = useBoleh()
  const [dialog, setDialog] = useState(false)
  const lewat = lewatTenggatSiaran(s.tindakLanjut, s.status, hariIni)
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader jejak={JEJAK} judul={s.judul} meta={`Dari Kabupaten ${s.kabupaten} · ${waktu(s.dikirimPada)}`} />
      {s.ditarik ? (
        <Banner>{`Ditarik oleh kabupaten pada ${formatTanggal(s.ditarik.pada)}. Isi siaran tidak ditampilkan lagi.`}</Banner>
      ) : (
        <>
          {s.isi !== null && <IsiSiaran isi={s.isi} lampiran={s.lampiran} />}
          {s.dibaca && <p className="text-teks-kecil text-tinta-2">{`Dibuka pertama oleh ${s.dibaca.olehNama}, ${waktu(s.dibaca.pada)}.`}</p>}
          {s.tindakLanjut && (
            <section aria-labelledby="judul-tindak-lanjut" className="flex flex-col items-start gap-3 border border-garis bg-lembar p-4">
              <h2 id="judul-tindak-lanjut" className={cn('font-medium', lewat && 'text-merah')}>
                {`Perlu tindak lanjut sampai ${formatTanggal(s.tindakLanjut.tenggat)}${lewat ? ' · lewat tenggat' : ''}`}
              </h2>
              {s.ditindaklanjuti ? (
                <>
                  <p>{`Sudah ditindaklanjuti ${formatTanggal(s.ditindaklanjuti.pada)} oleh ${s.ditindaklanjuti.olehNama}.`}</p>
                  {s.ditindaklanjuti.catatan && (
                    <blockquote className="border-l-2 border-garis pl-3 text-tinta-2">{s.ditindaklanjuti.catatan}</blockquote>
                  )}
                </>
              ) : boleh('siaran.tindak') ? (
                <Tombol varian="utama" onPress={() => setDialog(true)}>
                  Tandai sudah ditindaklanjuti
                </Tombol>
              ) : (
                <p className="text-tinta-2">Kepala Desa atau Sekretaris Desa menandai tindak lanjut.</p>
              )}
            </section>
          )}
        </>
      )}
      {dialog && <DialogTindakLanjut siaran={s} onTutup={() => setDialog(false)} />}
    </div>
  )
}
