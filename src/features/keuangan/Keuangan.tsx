import { ArrowsClockwise } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKeuangan, opsiApbdes, sinkronSiskeudes } from '@/api/keuangan'
import { formatRupiahRingkas } from '@/domain/format/angka'
import { BULAN_PENDEK, formatWaktuLog } from '@/domain/format/tanggal'
import { jumlahKelompok, kumulatif, pembiayaanNetto, posUtama, type Apbdes } from '@/domain/keuangan/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import { Rupiah } from '@/ui/domain/Rupiah'
import { LineChart } from '@/ui/grafik/LineChart'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { TabelAnggaran } from './TabelAnggaran'

const JEJAK = [{ label: 'Tata kelola' }]
const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/** Keuangan desa (SPEC §8): APBDes tahun berjalan yang disinkronkan dari Siskeudes. */
export function Keuangan() {
  const kueri = useQuery(opsiApbdes())
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat APBDes…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return <EmptyState judul="APBDes tahun ini belum tersedia" keterangan="Data muncul setelah APBDes disinkronkan dari Siskeudes." />
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiKeuangan apbdes={kueri.data} />
}

function IsiKeuangan({ apbdes: a }: { apbdes: Apbdes }) {
  const queryClient = useQueryClient()
  const { pengguna } = useSesiAdmin()
  const mengirim = useRef(false)
  const sinkron = useMutation({
    mutationFn: sinkronSiskeudes,
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciKeuangan.apbdes(), baru)
      void queryClient.invalidateQueries({ queryKey: ['beranda'] })
      tampilkanToast({ pesan: 'APBDes disinkronkan dari Siskeudes.', nada: 'berhasil' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      mengirim.current = false
    },
  })
  const pendapatan = jumlahKelompok(a, 'pendapatan')
  const belanja = jumlahKelompok(a, 'belanja')
  const netto = pembiayaanNetto(a)
  const deret = kumulatif(a.bulanan)
  const ringkas = (realisasi: number, anggaran: number) => (
    <>
      <Rupiah nilai={realisasi} ringkas /> dari <Rupiah nilai={anggaran} ringkas />
    </>
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        jejak={JEJAK}
        judul={`APBDes ${a.tahun}`}
        meta={`Disinkronkan dari Siskeudes · ${formatWaktuLog(a.sinkronPada)}`}
        aksi={
          boleh(pengguna.peran, 'keuangan.sinkron') && (
            <Tombol
              ikon={<ArrowsClockwise aria-hidden size={16} />}
              memuat={sinkron.isPending}
              onPress={() => {
                if (mengirim.current) return
                mengirim.current = true
                sinkron.mutate()
              }}
            >
              Sinkron Siskeudes
            </Tombol>
          )
        }
      />
      <section aria-label="Ringkasan realisasi" className="grid gap-6 sm:grid-cols-3">
        <MiniBar label="Pendapatan" nilai={pendapatan.realisasi} maks={pendapatan.anggaran} keterangan={ringkas(pendapatan.realisasi, pendapatan.anggaran)} />
        <MiniBar label="Belanja" nilai={belanja.realisasi} maks={belanja.anggaran} keterangan={ringkas(belanja.realisasi, belanja.anggaran)} />
        <div className="flex flex-col gap-1 text-teks-kecil">
          <span>Pembiayaan netto</span>
          <Rupiah nilai={netto.anggaran} className="font-mono text-dasar" />
          <span className="text-tinta-2">SiLPA dikurangi penyertaan modal</span>
        </div>
      </section>
      <TabelAnggaran judul="Pendapatan per sumber" baris={posUtama(a, 'pendapatan')} />
      <TabelAnggaran judul="Belanja per bidang" baris={posUtama(a, 'belanja')} />
      <TabelAnggaran
        judul="Pembiayaan"
        baris={[
          ...posUtama(a, 'pembiayaan-penerimaan').map((p) => ({ ...p, nama: `Penerimaan · ${p.nama}` })),
          ...posUtama(a, 'pembiayaan-pengeluaran').map((p) => ({ ...p, nama: `Pengeluaran · ${p.nama}` })),
        ]}
        jumlah={{ label: 'Pembiayaan netto', nilai: netto }}
      />
      <section aria-labelledby="judul-bulanan" className="flex flex-col gap-2">
        <h2 id="judul-bulanan" className={judulBagian}>
          Realisasi kumulatif per bulan
        </h2>
        <LineChart
          label="Realisasi kumulatif per bulan"
          judulSumbuX="Bulan"
          sumbuX={deret.map((d) => BULAN_PENDEK[Number(d.bulan.slice(5, 7)) - 1])}
          seri={[
            { id: 'pendapatan', label: 'Pendapatan', nilai: deret.map((d) => d.pendapatan) },
            { id: 'belanja', label: 'Belanja', nilai: deret.map((d) => d.belanja) },
          ]}
          format={formatRupiahRingkas}
        />
      </section>
    </div>
  )
}
