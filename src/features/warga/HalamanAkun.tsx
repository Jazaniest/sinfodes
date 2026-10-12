import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Akun } from './Akun'
import { keluarWarga } from './masuk-warga'

/** Pembungkus rute: keluar menghapus sesi warga saja, lalu ke halaman masuk warga (fokus review 1). */
export function HalamanAkun() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return (
    <Akun
      onKeluar={() => {
        keluarWarga(queryClient)
        void router.navigate({ to: '/warga/masuk' })
      }}
    />
  )
}
