import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useMemo } from 'react'
import { Link } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { kunciNotifikasi, opsiNotifikasi, tandaiDibaca } from '@/api/notifikasi'
import { formatAngka } from '@/domain/format/angka'
import { formatJam } from '@/domain/format/tanggal'
import { hrefNotifikasi, kelompokPerHari, type Notifikasi } from '@/domain/notifikasi/schema'
import { cn } from '@/ui/cn'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

function IsiButir({ n }: { n: Notifikasi }) {
  return (
    <>
      <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', n.dibaca ? 'bg-transparent' : 'bg-biru')} />
      <span className="min-w-0 flex-1">
        <span className={cn('block', !n.dibaca && 'font-medium')}>
          {n.judul}
          {!n.dibaca && <span className="sr-only"> (belum dibaca)</span>}
        </span>
        {n.isi && <span className="block text-teks-kecil text-tinta-2">{n.isi}</span>}
      </span>
      <time dateTime={n.waktu} className="shrink-0 font-mono text-teks-kecil text-tinta-2">
        {formatJam(n.waktu)}
      </time>
    </>
  )
}

function Kelompok({ judul, item, onDibaca }: { judul: string; item: readonly Notifikasi[]; onDibaca: (id: string) => void }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-label font-medium text-tinta-2 uppercase">
        {judul}
      </h2>
      <ul aria-label={`Notifikasi ${judul.toLowerCase()}`} className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
        {item.map((n) => {
          const href = hrefNotifikasi(n)
          return (
            <li key={n.id}>
              {href ? (
                <Link
                  href={href}
                  onPress={() => {
                    if (!n.dibaca) onDibaca(n.id)
                  }}
                  className="flex gap-3 px-4 py-3 text-tinta outline-none hover:bg-kertas-2 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-solid data-focus-visible:outline-biru"
                >
                  <IsiButir n={n} />
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">
                  <IsiButir n={n} />
                  {!n.dibaca && (
                    <Tombol varian="teks" ukuran="kecil" onPress={() => onDibaca(n.id)}>
                      Tandai dibaca
                    </Tombol>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Notifikasi pengguna (SPEC §5.5): dikelompokkan per hari, yang belum dibaca bertitik biru dan bercetak tebal. */
export function DaftarNotifikasi({ sekarang }: { sekarang?: Date }) {
  const queryClient = useQueryClient()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const kueri = useQuery(opsiNotifikasi())
  const tandai = useMutation({
    mutationFn: (ids: string[] | null) => tandaiDibaca(ids),
    onSuccess: (kotak) => queryClient.setQueryData(kunciNotifikasi, kotak),
    onError: (galat) => tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' }),
  })

  const kotak = kueri.data
  const belum = kotak?.belumDibaca ?? 0
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        judul="Notifikasi"
        meta={kotak ? (belum > 0 ? `${formatAngka(belum)} belum dibaca` : 'Semua sudah dibaca') : null}
        aksi={
          belum > 0 && (
            <Tombol memuat={tandai.isPending && tandai.variables === null} onPress={() => tandai.mutate(null)}>
              Tandai semua sudah dibaca
            </Tombol>
          )
        }
      />
      {kueri.isPending ? (
        <BarisKerangka jumlah={5} label="Memuat notifikasi…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : kueri.data.data.length === 0 ? (
        <EmptyState
          judul="Belum ada notifikasi"
          keterangan="Notifikasi muncul saat ada permohonan baru, surat ditandatangani atau dikembalikan, dan laporan dari warga."
        />
      ) : (
        kelompokPerHari(kueri.data.data, hariIni).map((g) => <Kelompok key={g.judul} judul={g.judul} item={g.item} onDibaca={(id) => tandai.mutate([id])} />)
      )}
    </div>
  )
}
