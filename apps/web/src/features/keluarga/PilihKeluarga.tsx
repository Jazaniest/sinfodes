import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { cariKeluarga, kunciKeluarga } from '@/api/keluarga'
import { formatAngka } from '@/domain/format/angka'
import { kataCukup } from '@/domain/penduduk/cari'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { alamatPendek } from '@/domain/wilayah/alamat'
import { useTunda } from '@/ui/hooks/useTunda'
import { ComboBoxCari, type OpsiCari } from '@/ui/isian/ComboBoxCari'
import { useSesiAdmin } from '../admin/sesi-konteks'
import type { OpsiKeluarga } from './opsi-keluarga'

const FILTER_CARI = { pageSize: 25 } as const
const labelKk = (k: OpsiKeluarga) => `KK ${k.namaKepala}`

type Props = {
  label: string
  terpilih: OpsiKeluarga | null
  onPilih: (k: OpsiKeluarga | null) => void
  galat?: string
  keterangan?: string
  isDisabled?: boolean
  className?: string
}

/** Pemilih KK: nomor KK (≥ 4 angka) atau nama kepala keluarga, dicari lewat POST (SPEC §6.4). */
export function PilihKeluarga({ label, terpilih, onPilih, galat, keterangan, isDisabled, className }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const [kata, setKata] = useState(terpilih ? labelKk(terpilih) : '')
  const kataTunda = useTunda(kata.trim(), 300)
  const bolehCari = kataCukup(kataTunda) && !(terpilih !== null && kataTunda === labelKk(terpilih))
  const hasil = useQuery({
    queryKey: kunciKeluarga.cari(kataTunda, FILTER_CARI),
    queryFn: ({ signal }) => cariKeluarga(kataTunda, FILTER_CARI, signal),
    enabled: bolehCari,
  })
  const daftar: OpsiKeluarga[] = bolehCari ? (hasil.data?.data ?? []) : []
  const semua = terpilih && !daftar.some((k) => k.id === terpilih.id) ? [terpilih, ...daftar] : daftar
  const opsi: OpsiCari[] = semua.map((k) => ({
    id: k.id,
    label: labelKk(k),
    keterangan: `${kelompokkanNik(k.nomorKk)} · ${alamatPendek(k, dusun, desa.istilahWilayah)} · ${formatAngka(k.jumlahAnggota)} anggota`,
  }))
  return (
    <ComboBoxCari
      label={label}
      kata={kata}
      onKata={setKata}
      opsi={opsi}
      terpilih={terpilih?.id ?? null}
      onPilih={(id) => onPilih(id === null ? null : (semua.find((k) => k.id === id) ?? null))}
      memuat={bolehCari && hasil.isFetching}
      teksKosong={kataCukup(kata.trim()) ? 'Tidak ada KK yang cocok.' : 'Ketik nomor KK (minimal 4 angka) atau nama kepala keluarga.'}
      placeholder="Nomor KK atau nama kepala keluarga"
      galat={galat}
      keterangan={keterangan}
      isDisabled={isDisabled}
      className={className}
    />
  )
}
