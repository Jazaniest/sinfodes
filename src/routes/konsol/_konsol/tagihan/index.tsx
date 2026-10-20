import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TAB_TAGIHAN } from '@/domain/langganan/tagihan'
import { HalamanDaftarTagihan } from '@/features/konsol/tagihan/HalamanTagihan'

// Tab kosong atau tidak dikenal berarti server memilih (Menunggu verifikasi bila ada isinya). Kata pencarian tidak masuk alamat.
export const Route = createFileRoute('/konsol/_konsol/tagihan/')({
  validateSearch: z.object({ tab: z.enum(TAB_TAGIHAN).optional().catch(undefined) }),
  component: HalamanDaftarTagihan,
})
