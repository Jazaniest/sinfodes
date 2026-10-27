import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HalamanVerifikasi } from '@/features/publik/verifikasi/HalamanVerifikasi'

export const Route = createFileRoute('/desa/$slug/verifikasi')({
  validateSearch: z.object({ kode: z.string().max(40).optional().catch(undefined) }),
  component: HalamanVerifikasi,
})
