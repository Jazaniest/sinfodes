import { ArrowCounterClockwise, CheckCircle, PaperPlaneTilt } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { balasPengaduan, kunciPengaduan, opsiPengaduan, ubahStatusPengaduan } from '@/api/pengaduan'
import { segarkanPengaduan } from '@/api/segarkan'
import { formatWaktuLog } from '@/domain/format/tanggal'
import { balasanPengaduanSchema, formatLama, type Pengaduan, type StatusTujuan } from '@/domain/pengaduan/schema'
import { useBoleh } from '@/features/admin/useBoleh'
import { namaDusun } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { TextArea } from '@/ui/isian/TextArea'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { Percakapan } from './Percakapan'

type Props = { id: string; onKotor?: (kotor: boolean) => void }

const JEJAK = [{ label: 'Pengaduan', href: '/admin/pengaduan' }]
const redup = (teks: string) => <span className="text-tinta-2">{teks}</span>

/** Detail pengaduan (SPEC §8): percakapan dengan warga, balasan, dan perubahan status. */
export function DetailPengaduan({ id, onKotor }: Props) {
  const kueri = useQuery(opsiPengaduan(id))
  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat pengaduan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judulHalaman
          judul="Pengaduan tidak ditemukan"
          keterangan="Pengaduan ini tidak ada, atau berada di luar wilayah Anda."
          aksi={<Tautan href="/admin/pengaduan">Kembali ke Pengaduan</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiPengaduan pengaduan={kueri.data} onKotor={onKotor} />
}

function IsiPengaduan({ pengaduan: a, onKotor }: { pengaduan: Pengaduan; onKotor?: (kotor: boolean) => void }) {
  const queryClient = useQueryClient()
  const { desa, dusun } = useSesiAdmin()
  const boleh = useBoleh()
  const [balasan, setBalasan] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const mengirim = useRef(false)
  const mengubah = useRef(false)
  const bolehTanggapi = boleh('pengaduan.tanggapi')
  const d = dusun.find((x) => x.id === a.dusunId)

  // Balasan yang sudah diketik tidak hilang diam-diam saat meninggalkan halaman.
  useEffect(() => {
    onKotor?.(balasan.trim() !== '')
  }, [balasan, onKotor])

  const terima = (baru: Pengaduan) => {
    queryClient.setQueryData(kunciPengaduan.detail(baru.id), baru)
    void segarkanPengaduan(queryClient)
  }
  const kirim = useMutation({
    mutationFn: (isi: string) => balasPengaduan(a.id, isi),
    onSuccess: (baru) => {
      terima(baru)
      setBalasan('')
      tampilkanToast({ pesan: 'Balasan terkirim. Warga bisa membacanya di layanan warga.', nada: 'berhasil' })
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && e.fields.isi) {
        setGalat(e.fields.isi)
        return
      }
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const ubahStatus = useMutation({
    mutationFn: (ke: StatusTujuan) => ubahStatusPengaduan(a.id, ke),
    onSuccess: (baru) => {
      terima(baru)
      tampilkanToast({ pesan: baru.status === 'selesai' ? 'Pengaduan ditandai selesai.' : 'Pengaduan dibuka kembali.', nada: 'berhasil' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      mengubah.current = false
    },
  })
  const kirimBalasan = () => {
    if (mengirim.current) return
    const periksa = balasanPengaduanSchema.safeParse({ isi: balasan })
    if (!periksa.success) {
      setGalat(periksa.error.issues[0]?.message ?? 'Balasan tidak valid')
      return
    }
    mengirim.current = true
    kirim.mutate(periksa.data.isi)
  }
  const pindahStatus = (ke: StatusTujuan) => {
    if (mengubah.current) return
    mengubah.current = true
    ubahStatus.mutate(ke)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={a.judul}
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Cap varian={a.status} />
            <span className="font-mono">{a.nomor}</span>
            <span>
              · {a.kategori}
              {d && ` · ${namaDusun(d, desa.istilahWilayah)}`}
            </span>
          </span>
        }
        aksi={
          bolehTanggapi && a.status === 'ditanggapi' ? (
            <Tombol ikon={<CheckCircle aria-hidden size={16} />} memuat={ubahStatus.isPending} onPress={() => pindahStatus('selesai')}>
              Tandai selesai
            </Tombol>
          ) : bolehTanggapi && a.status === 'selesai' ? (
            <Tombol ikon={<ArrowCounterClockwise aria-hidden size={16} />} memuat={ubahStatus.isPending} onPress={() => pindahStatus('ditanggapi')}>
              Buka kembali
            </Tombol>
          ) : undefined
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="judul-percakapan" className="flex max-w-3xl flex-col gap-6">
          <h2 id="judul-percakapan" className="text-label font-medium text-tinta-2 uppercase">
            Percakapan
          </h2>
          <Percakapan percakapan={a.percakapan} pelapor={a.pelapor.nama} />
          {bolehTanggapi &&
            (a.status === 'selesai' ? (
              <p className="border-l-2 border-garis pl-4 text-tinta-2">Pengaduan ini sudah selesai. Buka kembali untuk membalas warga.</p>
            ) : (
              <form
                aria-label="Balas warga"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  kirimBalasan()
                }}
              >
                <TextArea
                  label="Balasan untuk warga"
                  keterangan="Balasan tampil di layanan warga dan dibaca pelapor."
                  value={balasan}
                  onChange={(nilai) => {
                    setBalasan(nilai)
                    setGalat(null)
                  }}
                  galat={galat ?? undefined}
                  baris={4}
                />
                <div>
                  <Tombol type="submit" varian="utama" memuat={kirim.isPending} ikon={<PaperPlaneTilt aria-hidden size={16} />}>
                    Kirim balasan
                  </Tombol>
                </div>
              </form>
            ))}
        </section>
        <aside aria-label="Rincian pengaduan">
          <DescriptionList
            items={[
              {
                label: 'Pelapor',
                nilai: boleh('penduduk.lihat') ? (
                  <Tautan href={`/admin/kependudukan/penduduk/${a.pelapor.pendudukId}`}>{a.pelapor.nama}</Tautan>
                ) : (
                  a.pelapor.nama
                ),
              },
              { label: 'Kategori', nilai: a.kategori },
              { label: 'Lokasi', nilai: a.lokasi ?? redup('Tidak disebutkan') },
              { label: 'Masuk', nilai: formatWaktuLog(a.masukPada) },
              {
                label: 'Tanggapan pertama',
                nilai: a.tanggapanPertamaPada ? `${formatLama(a.masukPada, a.tanggapanPertamaPada)} setelah masuk` : redup('Belum dibalas'),
              },
              { label: 'Selesai', nilai: a.selesaiPada ? formatWaktuLog(a.selesaiPada) : redup('Belum selesai') },
            ]}
          />
        </aside>
      </div>
    </div>
  )
}
