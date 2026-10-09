import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { opsiLaporan } from '@/api/laporan'
import { opsiPenduduk } from '@/api/penduduk'
import { formatWaktuRelatif } from '@/domain/format/tanggal'
import type { Penduduk } from '@/domain/penduduk/schema'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { DialogTolakLaporan } from '../laporan/DialogTolakLaporan'
import { CatatLahir } from './alur/CatatLahir'
import { isianDariLaporan } from './alur/isian'

type Props = {
  laporanId: string
  onTersimpan: (bayi: Penduduk) => void
  onBatal: () => void
  onKotor?: (kotor: boolean) => void
  sekarang?: Date
}

/** Alur Lahir yang dibuka dari laporan kelahiran warga (SPEC §5.3): isian terisi dari laporan, tinggal diperiksa. */
export function CatatLahirDariLaporan({ laporanId, sekarang, ...alur }: Props) {
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const laporan = useQuery(opsiLaporan(laporanId))
  const isi = laporan.data?.isi.jenis === 'kelahiran' ? laporan.data.isi : null
  const ibu = useQuery({ ...opsiPenduduk(isi?.ibuId ?? ''), enabled: isi !== null })
  const kk = useQuery({ ...opsiKeluarga(ibu.data?.keluargaId ?? ''), enabled: ibu.data !== undefined })
  const galat = laporan.error ?? ibu.error ?? kk.error
  const keBeranda = <Tautan href="/admin">Kembali ke Beranda</Tautan>
  const memuat = <BarisKerangka jumlah={4} label="Memuat laporan kelahiran…" />
  const [tolak, setTolak] = useState(false)
  const sudahDitangani = laporan.data !== undefined && laporan.data.status !== 'baru'
  const { onKotor } = alur

  // Laporan yang ditolak di halaman ini: formulirnya hilang, jadi penjaga keluar halaman ikut dilepas.
  useEffect(() => {
    if (sudahDitangani) onKotor?.(false)
  }, [sudahDitangani, onKotor])

  if (galat) {
    const cobaLagi = () => {
      void laporan.refetch()
      void ibu.refetch()
      void kk.refetch()
    }
    return <ErrorState pesan={pesanGalat(galat)} onCobaLagi={cobaLagi} />
  }
  if (!laporan.data) return memuat
  if (!isi) return <EmptyState judul="Ini bukan laporan kelahiran" aksi={keBeranda} />
  if (sudahDitangani) {
    return (
      <EmptyState
        judul="Laporan kelahiran ini sudah ditangani"
        keterangan="Kelahirannya sudah dicatat, atau laporannya ditolak."
        aksi={keBeranda}
      />
    )
  }
  if (!ibu.data || !kk.data) return memuat
  return (
    <div className="flex flex-col gap-4">
      <Banner
        nada="info"
        judul={`Dilaporkan ${laporan.data.pelapor.nama} lewat layanan warga, ${formatWaktuRelatif(laporan.data.dibuatPada, hariIni)}`}
        aksi={
          <Tombol ukuran="kecil" varian="teks" onPress={() => setTolak(true)}>
            Tolak laporan
          </Tombol>
        }
      >
        Isian sudah terisi dari laporan. Periksa dan lengkapi sebelum menyimpan; setelah disimpan, laporan ini selesai. Bila
        kelahiran ini sudah tercatat atau laporannya keliru, tolak laporannya.
      </Banner>
      {tolak && <DialogTolakLaporan laporan={laporan.data} onTutup={() => setTolak(false)} />}
      <CatatLahir
        {...alur}
        sekarang={sekarang}
        laporanId={laporanId}
        awal={isianDariLaporan(isi, ibu.data, kk.data, laporan.data.pelapor.nama)}
      />
    </div>
  )
}
