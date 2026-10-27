import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { opsiCariPenduduk } from '@/api/penduduk'
import { formatUmur } from '@/domain/format/tanggal'
import { kataCukup } from '@/domain/penduduk/cari'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import { alamatPendek } from '@/domain/wilayah/alamat'
import { useTunda } from '@/ui/hooks/useTunda'
import { ComboBoxCari, type OpsiCari } from '@/ui/isian/ComboBoxCari'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { jenisKelaminPanjang } from './kolom'

type Props = {
  label: string
  terpilih: Penduduk | null
  onPilih: (p: Penduduk | null) => void
  /** Filter tambahan di API, mis. { jk: 'P' } untuk memilih ibu. Bawaan: hanya penduduk Hidup. */
  filter?: Partial<FilterPenduduk>
  galat?: string
  keterangan?: string
  isDisabled?: boolean
  hariIni?: Date
  className?: string
}

/**
 * Pemilih penduduk: ketik nama atau ≥ 4 angka NIK; dicari lewat POST supaya NIK tidak masuk URL (SPEC §3.4).
 * Untuk isian awal yang baru tersedia setelah dimuat, pasang `key` supaya komponen dipasang ulang.
 */
export function PilihPenduduk({ label, terpilih, onPilih, filter, galat, keterangan, isDisabled, hariIni, className }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const sekarang = useMemo(() => hariIni ?? new Date(), [hariIni])
  const [kata, setKata] = useState(terpilih?.nama ?? '')
  const kataTunda = useTunda(kata.trim(), 300)
  const bolehCari = kataCukup(kataTunda) && !(terpilih !== null && kataTunda === terpilih.nama)
  const hasil = useQuery({ ...opsiCariPenduduk(kataTunda, { status: 'Hidup', pageSize: 25, ...filter }), enabled: bolehCari })
  const daftar: Penduduk[] = bolehCari ? (hasil.data?.data ?? []) : []
  const semua = terpilih && !daftar.some((p) => p.id === terpilih.id) ? [terpilih, ...daftar] : daftar
  const opsi: OpsiCari[] = semua.map((p) => ({
    id: p.id,
    label: p.nama,
    keterangan: [
      p.nik ? kelompokkanNik(p.nik) : 'Belum ada NIK',
      `${jenisKelaminPanjang(p.jenisKelamin)}, ${formatUmur(p.tanggalLahir, sekarang)}`,
      alamatPendek(p, dusun, desa.istilahWilayah),
    ].join(' · '),
  }))
  return (
    <ComboBoxCari
      label={label}
      kata={kata}
      onKata={setKata}
      opsi={opsi}
      terpilih={terpilih?.id ?? null}
      onPilih={(id) => onPilih(id === null ? null : (semua.find((p) => p.id === id) ?? null))}
      memuat={bolehCari && hasil.isFetching}
      teksKosong={kataCukup(kata.trim()) ? 'Tidak ada penduduk yang cocok.' : 'Ketik nama, atau minimal 4 angka NIK.'}
      placeholder="Nama atau NIK"
      galat={galat}
      keterangan={keterangan}
      isDisabled={isDisabled}
      className={className}
    />
  )
}
