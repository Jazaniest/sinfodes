import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { ambilTokenSesi } from '@/api/client'
import { pesanGalat } from '@/api/galat'
import { LABEL_PERAN } from '@/domain/pengguna/schema'
import { tampilkanToast } from '@/ui/toast/antrean'
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

  return <PilihPeranDemo akun={kendali.AKUN_DEMO_ADMIN} aktifId={aktifId} sibuk={sibuk} onPilih={(a) => void pilih(a)} />
}
