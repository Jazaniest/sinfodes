import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { ambilTokenSesi } from '@/api/client'
import { pesanGalat } from '@/api/galat'
import { opsiSesi } from '@/api/sesi'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import { tampilkanToast } from '@/ui/toast/antrean'
import { akunLain } from './akun-lain'
import { masukDemo } from './masuk-demo'
import { PilihPeranDemo, type AkunDemo } from './PilihPeranDemo'
import { useKendaliDemo } from './useKendaliDemo'

/** Menyambungkan pilihan peran ke API, cache, dan router; dipasang di toolbar demo saat berada di /admin. */
export function PilihPeranPanel() {
  const kendali = useKendaliDemo()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [aktifId, setAktifId] = useState(() => ambilTokenSesi()?.replace(/^demo\./, '') ?? null)
  const [sibuk, setSibuk] = useState(false)
  // Sesi panel sudah dimuat penjaga rute; dipakai untuk menampilkan akun desa lain apa adanya (tahap 6D).
  const sesi = useQuery({ ...opsiSesi(), enabled: aktifId !== null })
  if (!kendali) return null

  const pilih = async (akun: AkunDemo) => {
    setSibuk(true)
    try {
      await masukDemo(akun.email, kendali.KATA_SANDI_DEMO, queryClient)
      setAktifId(akun.id)
      await router.invalidate()
      tampilkanToast({ pesan: `Sekarang sebagai ${akun.nama} (${LABEL_PERAN[akun.peran]}).`, nada: 'berhasil' })
    } catch (e) {
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    } finally {
      setSibuk(false)
    }
  }

  return (
    <PilihPeranDemo
      akun={kendali.AKUN_DEMO_ADMIN}
      aktifId={aktifId}
      lain={akunLain(kendali.AKUN_DEMO_ADMIN, sesi.data)}
      sibuk={sibuk}
      onPilih={(a) => void pilih(a)}
    />
  )
}
