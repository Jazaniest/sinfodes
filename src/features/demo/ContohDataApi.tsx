import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciPenduduk, opsiDaftarPenduduk } from '@/api/penduduk'
import { masuk } from '@/api/sesi'
import { simpanSesi } from '@/app/sesi'
import { formatAngka } from '@/domain/format/angka'
import { formatUmur } from '@/domain/format/tanggal'
import { Cap } from '@/ui/cap/Cap'
import { Nik } from '@/ui/domain/Nik'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const FILTER = { urut: 'diubah', pageSize: 25 } as const

/** Bukti alur penuh: layar → TanStack Query → pemanggil API → MSW → data demo (SPEC §3.3). */
export function ContohDataApi() {
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiDaftarPenduduk(FILTER))
  const [sedangMasuk, setSedangMasuk] = useState(false)
  const [galatMasuk, setGalatMasuk] = useState<string | null>(null)

  const masukSebagaiOperator = async () => {
    setSedangMasuk(true)
    setGalatMasuk(null)
    try {
      const { token } = await masuk('rosmiati@sungaisialang.desa.id', 'demo')
      simpanSesi(token)
      await queryClient.invalidateQueries({ queryKey: kunciPenduduk.semua })
    } catch (e) {
      setGalatMasuk(pesanGalat(e))
    } finally {
      setSedangMasuk(false)
    }
  }

  if (kueri.isPending) return <BarisKerangka jumlah={5} label="Memuat contoh data penduduk…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'UNAUTHENTICATED') {
      return (
        <EmptyState
          judul="Perlu masuk dulu"
          keterangan={
            galatMasuk ?? 'Data penduduk hanya bisa dilihat perangkat desa. Masuk sebagai operator demo untuk memuat contoh.'
          }
          aksi={
            <Tombol varian="utama" memuat={sedangMasuk} onPress={() => void masukSebagaiOperator()}>
              Masuk sebagai Rosmiati (Operator)
            </Tombol>
          }
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }

  return (
    <div>
      <p className="text-tinta-2">
        Menampilkan 5 dari {formatAngka(kueri.data.meta.total)} penduduk, diurutkan dari yang terakhir diubah.
      </p>
      <ul className="mt-3 divide-y divide-garis border-y border-garis bg-lembar">
        {kueri.data.data.slice(0, 5).map((p) => (
          <li key={p.id} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[1fr_14rem_auto] sm:items-center sm:gap-4">
            <div>
              <p className="font-medium">{p.nama}</p>
              <Nik nik={p.nik} />
            </div>
            <p className="text-tinta-2">
              {p.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'} · {formatUmur(p.tanggalLahir, new Date())} · RT {p.rt}/RW {p.rw}
            </p>
            <div className="flex flex-wrap gap-1">
              {p.ktpEl === 'Belum rekam' && <Cap varian="belum-ktp-el" />}
              <Cap varian="hidup" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
