import { getRouteApi, useRouter } from '@tanstack/react-router'
import { FormLaporan } from './FormLaporan'

const rute = getRouteApi('/warga/_app/keluarga/lapor')

/** Pembungkus rute: sesudah terkirim, kembali ke Keluarga saya. */
export function HalamanLapor() {
  const { anggota } = rute.useSearch()
  const router = useRouter()
  return <FormLaporan anggotaAwal={anggota} onTerkirim={() => void router.navigate({ to: '/warga/keluarga' })} />
}
