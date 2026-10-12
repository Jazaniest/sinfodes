import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { balasPengaduanWarga, kunciWarga, opsiDetailPengaduanWarga } from '@/api/warga'
import { formatWaktuLog } from '@/domain/format/tanggal'
import { LABEL_STATUS_PENGADUAN, type EntriPengaduan } from '@/domain/pengaduan/schema'
import { balasanWargaSchema } from '@/domain/warga/pengaduan'
import { Cap } from '@/ui/cap/Cap'
import { cn } from '@/ui/cn'
import { TextArea } from '@/ui/isian/TextArea'
import { Tautan } from '@/ui/navigasi/Tautan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

function Entri({ e }: { e: EntriPengaduan }) {
  if (e.jenis === 'status') {
    return (
      <li className="self-center text-teks-kecil text-tinta-2">
        Status menjadi {LABEL_STATUS_PENGADUAN[e.status]} · {formatWaktuLog(e.waktu)}
      </li>
    )
  }
  const dariWarga = e.jenis === 'warga'
  return (
    <li className={cn('flex max-w-[85%] flex-col gap-1 rounded-2 px-4 py-3', dariWarga ? 'self-end bg-biru-muda' : 'self-start border border-garis bg-lembar')}>
      <p className="text-teks-kecil font-medium text-tinta-2">{dariWarga ? 'Anda' : `${e.oleh.nama} · ${e.jabatan}`}</p>
      <p className="whitespace-pre-line">{e.isi}</p>
      {dariWarga && e.foto && <p className="text-teks-kecil text-tinta-2">Foto: {e.foto.berkas}</p>}
      <p className="text-teks-kecil text-tinta-2">{formatWaktuLog(e.waktu)}</p>
    </li>
  )
}

/** Satu pengaduan beserta percakapannya dengan desa (SPEC §10). Warga bisa membalas selama belum Selesai. */
export function DetailPengaduan({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiDetailPengaduanWarga(id))
  const [balasan, setBalasan] = useState('')
  const [galat, setGalat] = useState<string | undefined>()
  const mengirim = useRef(false)
  const balas = useMutation({
    mutationFn: (isi: string) => balasPengaduanWarga(id, isi),
    onSuccess: (a) => {
      queryClient.setQueryData(kunciWarga.detailPengaduan(id), a)
      void queryClient.invalidateQueries({ queryKey: kunciWarga.pengaduan, exact: true })
      setBalasan('')
    },
    // Balasan yang gagal terkirim tetap ada di kotak isian (SPEC §10: tahan sinyal lemah).
    onError: (e) => setGalat(e instanceof GalatApi && e.fields.isi ? e.fields.isi : pesanGalat(e)),
    onSettled: () => {
      mengirim.current = false
    },
  })

  if (kueri.isPending) return <BarisKerangka jumlah={4} label="Memuat pengaduan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judul="Pengaduan tidak ditemukan"
          keterangan="Alamatnya mungkin salah, atau pengaduan ini bukan milik Anda."
          aksi={<Tautan href="/warga/pengaduan">Kembali ke Pengaduan saya</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  const a = kueri.data

  const kirim = () => {
    if (mengirim.current) return
    const isian = balasanWargaSchema.safeParse({ isi: balasan })
    if (!isian.success) {
      setGalat(isian.error.issues[0]?.message)
      return
    }
    mengirim.current = true
    setGalat(undefined)
    balas.mutate(isian.data.isi)
  }

  return (
    <article className="flex flex-col gap-5">
      <Tautan href="/warga/pengaduan" className="self-start">
        ← Pengaduan saya
      </Tautan>
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">{a.judul}</h1>
        <p className="text-tinta-2">{`${a.nomor} · ${a.kategori}`}</p>
        <p className="flex flex-wrap items-center gap-2">
          <Cap varian={a.status} />
          {a.lokasi && <span className="text-teks-kecil text-tinta-2">Lokasi: {a.lokasi}</span>}
        </p>
      </header>

      <ol aria-label="Percakapan pengaduan" className="flex flex-col gap-3">
        {a.percakapan.map((e) => (
          <Entri key={e.id} e={e} />
        ))}
      </ol>

      {a.status === 'selesai' ? (
        <section className="flex flex-col gap-3">
          <Banner nada="info" judul="Pengaduan ini sudah selesai">
            Bila masalahnya muncul lagi, sampaikan pengaduan baru.
          </Banner>
          <TautanTombol href="/warga/pengaduan/baru">Sampaikan pengaduan baru</TautanTombol>
        </section>
      ) : (
        <form
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault()
            kirim()
          }}
          className="flex flex-col gap-3"
        >
          <TextArea label="Balasan Anda" value={balasan} onChange={setBalasan} galat={galat} baris={3} />
          <Tombol type="submit" varian="utama" memuat={balas.isPending} className="self-start">
            Kirim balasan
          </Tombol>
        </form>
      )}
    </article>
  )
}
