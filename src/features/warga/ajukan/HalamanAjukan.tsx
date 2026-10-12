import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { opsiDetailRiwayat, opsiJenisSuratWarga } from '@/api/warga'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import type { AwalAjukan } from './ajukan'
import { AjukanSurat } from './AjukanSurat'

const rute = getRouteApi('/warga/_app/ajukan')

/** Pembungkus rute: `?ulang=` mengisi formulir dari permohonan yang ditolak. Bila tidak bisa dimuat, formulir mulai kosong. */
export function HalamanAjukan() {
  const { ulang } = rute.useSearch()
  const detail = useQuery({ ...opsiDetailRiwayat(ulang ?? ''), enabled: Boolean(ulang) })
  const jenis = useQuery({ ...opsiJenisSuratWarga(), enabled: Boolean(ulang) })
  if (!ulang) return <AjukanSurat />
  if (detail.isPending || jenis.isPending) return <BarisKerangka jumlah={4} label="Menyiapkan pengajuan ulang…" />
  const j = jenis.data?.find((x) => x.kode === detail.data?.jenis.kode)
  const awal: AwalAjukan | null =
    detail.data && j
      ? {
          jenisId: j.id,
          untukId: detail.data.permohonan.untuk.id,
          isian: detail.data.permohonan.isian,
          alasanDitolak: detail.data.permohonan.alasanDitolak,
        }
      : null
  return <AjukanSurat key={ulang} awal={awal} />
}
