import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HalamanDetailDesa } from '@/features/konsol/desa/HalamanDetailDesa'
import { TAB_DETAIL_DESA } from '@/features/konsol/desa/tab-detail'

// Tab kosong atau tidak dikenal berarti Ringkasan, jadi tautan ke detail desa tidak wajib membawa `search`.
export const Route = createFileRoute('/konsol/_konsol/desa/$id')({
  validateSearch: z.object({ tab: z.enum(TAB_DETAIL_DESA).optional().catch(undefined) }),
  component: HalamanDetailDesa,
})
